/**
 * Dev-only local RGS: the Stake wallet endpoints the game calls, served by the Vite dev server
 * under /__rgs so the game spins at plain http://localhost:3006/ (no Stake Dev Tool, no rgs_url).
 *
 * - Math folder: LOCAL_RGS_MATH_DIR, default `<web-sdk root>/../lockedin_fe_test_sample`
 *   (index.json, lookUpTable_<mode>_0.csv rows `id,weight,payout`, books_<mode>.jsonl.zst).
 * - Rounds are picked by LUT weight; the book line is looked up by its `id` (ids need not be sequential).
 * - Amounts are API integers (1_000_000 = 1 unit). `amount` is the base bet; the debit is
 *   amount × mode cost. The LUT payout is hundredths of the base bet (2500 = 25×), so
 *   round.payoutMultiplier = lut / 100 and round.payout = amount × lut / 100.
 * - In-memory per sessionID, start balance 10,000 USD. A round with a payout stays active until
 *   /wallet/end-round credits it; a zero-payout round closes at once (as on Stake).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { readRawBody } from './multipart';

export const LOCAL_RGS_PREFIX = '/__rgs';

const ZERO = BigInt(0);
const API = 1_000_000;
const START_BALANCE = 10_000 * API;
const CURRENCY = 'USD';
const BET_LEVELS_USD = [
	0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7,
	8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200,
	250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000,
];
const BET_LEVELS = BET_LEVELS_USD.map((level) => Math.round(level * API));
const CONFIG = {
	gameID: '',
	minBet: BET_LEVELS[0],
	maxBet: BET_LEVELS[BET_LEVELS.length - 1],
	stepBet: 10_000,
	defaultBetLevel: 200_000,
	betLevels: BET_LEVELS,
	betModes: {},
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
};

type ModeInfo = { name: string; cost: number; events: string; weights: string };
type Round = {
	betID: number;
	amount: number;
	payout: number;
	payoutMultiplier: number;
	active: boolean;
	mode: string;
	event: string | null;
	state: unknown[];
};
type Session = { balance: number; round: Round | null };
type ModeData = {
	ids: number[];
	cumulative: bigint[];
	total: bigint;
	payouts: number[];
	lines: Map<number, string>;
	stamp: string;
};

class RgsError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

/** Walk up from `start` to the folder holding pnpm-workspace.yaml (the web-sdk root). */
function findWorkspaceRoot(start: string): string {
	let dir = path.resolve(start);
	for (;;) {
		if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return path.resolve(start);
		dir = parent;
	}
}

export function defaultMathDir(viteRoot: string): string {
	return path.resolve(findWorkspaceRoot(viteRoot), '..', 'lockedin_fe_test_sample');
}

function decompress(buffer: Buffer): Buffer {
	const zstd = (zlib as unknown as { zstdDecompressSync?: (b: Buffer) => Buffer }).zstdDecompressSync;
	if (!zstd) throw new RgsError(500, 'ERR_GE', 'node:zlib has no zstdDecompressSync (needs Node 22.15+)');
	return zstd(buffer);
}

export function createLocalRgs(options: { mathDir: string; log?: (line: string) => void; error?: (line: string) => void }) {
	const mathDir = path.resolve(options.mathDir);
	const sessions = new Map<string, Session>();
	const cache = new Map<string, ModeData>();
	let betCounter = 0;

	const readModes = (): ModeInfo[] => {
		const file = path.join(mathDir, 'index.json');
		if (!fs.existsSync(file)) {
			throw new RgsError(503, 'ERR_GE', `local RGS math folder is missing ${file} (set LOCAL_RGS_MATH_DIR)`);
		}
		const index = JSON.parse(fs.readFileSync(file, 'utf8')) as { modes?: ModeInfo[] };
		return index.modes ?? [];
	};

	const loadMode = (info: ModeInfo): ModeData => {
		const lutFile = path.join(mathDir, info.weights);
		const bookFile = path.join(mathDir, info.events);
		const stamp = [lutFile, bookFile].map((file) => `${fs.statSync(file).mtimeMs}:${fs.statSync(file).size}`).join('|');
		const hit = cache.get(info.name);
		if (hit && hit.stamp === stamp) return hit;

		const ids: number[] = [];
		const payouts: number[] = [];
		const cumulative: bigint[] = [];
		let total = ZERO;
		for (const raw of fs.readFileSync(lutFile, 'utf8').split(/\r?\n/)) {
			const line = raw.trim();
			if (!line) continue;
			const [id, weight, payout] = line.split(',');
			const w = BigInt(weight);
			if (w <= ZERO) continue;
			total += w;
			ids.push(Number(id));
			payouts.push(Number(payout));
			cumulative.push(total);
		}

		const lines = new Map<number, string>();
		const text = decompress(fs.readFileSync(bookFile)).toString('utf8');
		for (const line of text.split('\n')) {
			if (!line.trim()) continue;
			const match = /^\s*\{\s*"id"\s*:\s*(\d+)/.exec(line);
			const id = match ? Number(match[1]) : (JSON.parse(line) as { id: number }).id;
			lines.set(id, line);
		}
		const missing = ids.filter((id) => !lines.has(id)).length;
		if (missing) options.error?.(`[local-rgs] ${info.name}: ${missing} LUT ids have no book line`);

		const data = { ids, cumulative, total, payouts, lines, stamp };
		cache.set(info.name, data);
		return data;
	};

	const pick = (data: ModeData): number => {
		if (data.total <= ZERO) throw new RgsError(500, 'ERR_GE', 'lookup table has no weight');
		const r = BigInt(`0x${randomBytes(16).toString('hex')}`) % data.total;
		let lo = 0;
		let hi = data.cumulative.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (data.cumulative[mid] > r) hi = mid;
			else lo = mid + 1;
		}
		return lo;
	};

	const session = (body: Record<string, unknown>): Session => {
		const id = typeof body.sessionID === 'string' ? body.sessionID : '';
		if (!id) throw new RgsError(400, 'ERR_IS', 'sessionID is required');
		let found = sessions.get(id);
		if (!found) {
			found = { balance: START_BALANCE, round: null };
			sessions.set(id, found);
		}
		return found;
	};

	const balanceOf = (s: Session) => ({ amount: s.balance, currency: CURRENCY });

	const routes: Record<string, (body: Record<string, unknown>) => unknown> = {
		'/wallet/authenticate': (body) => {
			const s = session(body);
			return { balance: balanceOf(s), config: CONFIG, round: s.round?.active ? s.round : null, meta: null };
		},
		'/wallet/balance': (body) => ({ balance: balanceOf(session(body)) }),
		'/wallet/play': (body) => {
			const s = session(body);
			const modeName = String(body.mode ?? '');
			const info = readModes().find((m) => m.name === modeName);
			if (!info) throw new RgsError(404, 'ERR_VAL', `mode "${modeName}" not found`);
			const amount = Number(body.amount);
			if (!Number.isInteger(amount) || amount < CONFIG.minBet || amount > CONFIG.maxBet || amount % CONFIG.stepBet !== 0) {
				throw new RgsError(400, 'ERR_VAL', `invalid bet amount ${body.amount}`);
			}
			if (s.round?.active) throw new RgsError(400, 'ERR_BE', 'player already has an active bet');
			const cost = Math.round(amount * info.cost);
			if (cost > s.balance) throw new RgsError(400, 'ERR_IPB', 'insufficient player balance');

			const data = loadMode(info);
			const index = pick(data);
			const id = data.ids[index];
			const line = data.lines.get(id);
			if (!line) throw new RgsError(500, 'ERR_GE', `book line ${id} not found in ${info.events}`);
			const book = JSON.parse(line) as { events?: unknown[] };
			const lut = data.payouts[index];
			const payout = Math.round((amount * lut) / 100);

			s.balance -= cost;
			s.round = {
				betID: ++betCounter,
				amount,
				payout,
				payoutMultiplier: lut / 100,
				active: payout > 0,
				mode: info.name,
				event: null,
				state: book.events ?? [],
			};
			return { balance: balanceOf(s), round: s.round };
		},
		'/wallet/end-round': (body) => {
			const s = session(body);
			if (s.round?.active) {
				s.balance += s.round.payout;
				s.round.active = false;
			}
			return { balance: balanceOf(s) };
		},
		'/bet/event': (body) => {
			const s = session(body);
			const event = body.event == null ? null : String(body.event);
			if (s.round?.active) s.round.event = event;
			return { event };
		},
	};

	const send = (res: ServerResponse, status: number, payload: unknown) => {
		res.statusCode = status;
		res.setHeader('content-type', 'application/json');
		res.setHeader('cache-control', 'no-store');
		res.end(JSON.stringify(payload));
	};

	/** Connect middleware mounted at LOCAL_RGS_PREFIX (req.url has the prefix stripped). */
	const middleware = async (req: IncomingMessage, res: ServerResponse) => {
		const url = (req.url ?? '').split('?')[0];
		const route = routes[url];
		if (!route) {
			send(res, 404, { error: 'ERR_VAL', message: `unknown local RGS endpoint ${url}` });
			return;
		}
		if (req.method !== 'POST') {
			send(res, 405, { error: 'ERR_VAL', message: 'use POST' });
			return;
		}
		try {
			const raw = (await readRawBody(req, 64 * 1024)).toString('utf8');
			const body = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
			send(res, 200, route(body));
		} catch (error) {
			if (error instanceof RgsError) {
				send(res, error.status, { error: error.code, message: error.message });
				return;
			}
			options.error?.(`[local-rgs] ${url}: ${String(error)}`);
			send(res, 500, { error: 'ERR_GE', message: String(error) });
		}
	};

	/** One startup line: the folder and its modes, or why it cannot serve. */
	const describe = () => {
		try {
			const modes = readModes().map((m) => `${m.name}(${m.cost}x)`);
			options.log?.(`[local-rgs] ${LOCAL_RGS_PREFIX} serving ${mathDir} modes: ${modes.join(', ')}`);
		} catch (error) {
			options.error?.(`[local-rgs] ${error instanceof Error ? error.message : String(error)}; /wallet/play will fail`);
		}
	};

	return { mathDir, middleware, describe };
}
