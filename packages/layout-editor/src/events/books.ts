/**
 * Read one round out of a zstd book. Dev-only (node:fs). The preview asks
 * the Vite plugin, which calls this, so a specific id does not have to be
 * copied into builder_rounds.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import type { BookEvent } from './play-book';

export type StoredRound = {
	id: number;
	criteria: string;
	payoutMultiplier: number;
	events: BookEvent[];
};

const cache = new Map<string, StoredRound[]>();

export function readModeRounds(booksDir: string, mode: string): StoredRound[] {
	const key = `${booksDir}:${mode}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const file = path.join(booksDir, `books_${mode}.jsonl.zst`);
	const text = zlib.zstdDecompressSync(fs.readFileSync(file)).toString('utf8');
	const rounds: StoredRound[] = [];
	for (const line of text.split('\n')) {
		if (!line) continue;
		const row = JSON.parse(line) as StoredRound;
		rounds.push({
			id: row.id,
			criteria: row.criteria,
			payoutMultiplier: row.payoutMultiplier,
			events: row.events,
		});
	}
	cache.set(key, rounds);
	return rounds;
}

export function readRound(booksDir: string, mode: string, id: number): StoredRound | null {
	return readModeRounds(booksDir, mode).find((round) => round.id === id) ?? null;
}
