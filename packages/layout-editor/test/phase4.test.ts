import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readRound } from '../src/events/books';
import {
	bindBookEvent,
	clearBookBindings,
	moodForMode,
	playBookEvent,
	playBookEvents,
	winBindingAllowed,
	winCash,
	type BookEvent,
} from '../src/events/play-book';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const devDir = path.join(repoRoot, 'apps/locked/dev');
const LEGACY = ['wildUpgrade', 'expandWild', 'wildMultiplier', 'updateExpandingWilds', 'createBonusSnapshot'];

describe('phase 4 books', () => {
	it('emits only events that occur, marked generated, outside builder.json', () => {
		const catalogue = JSON.parse(fs.readFileSync(path.join(devDir, 'event-catalogue.json'), 'utf8')) as {
			generated: boolean;
			events: { type: string; fields: string[] }[];
		};
		const rounds = JSON.parse(fs.readFileSync(path.join(devDir, 'builder_rounds.json'), 'utf8')) as {
			generated: boolean;
			modes: Record<string, { rounds: { id: number; criteria: string; tags: string[] }[]; samples: { events: BookEvent[] }[] }>;
		};
		expect(catalogue.generated).toBe(true);
		expect(rounds.generated).toBe(true);
		const types = catalogue.events.map((event) => event.type);
		for (const legacy of LEGACY) expect(types).not.toContain(legacy);
		expect(types).toContain('reveal');
		expect(types).toContain('contrabandSwap');
		expect(types).toContain('setWin');
		expect(types).not.toContain('FS3');
		expect(catalogue.events.find((event) => event.type === 'setWin')?.fields).toEqual(['amount', 'winLevel']);
		expect(rounds.modes.degen_spin.rounds.length).toBeGreaterThan(0);
		expect(rounds.modes.degen_spin.rounds.some((round) => round.tags.includes('degen_spin'))).toBe(true);
		expect(rounds.modes.base.samples.some((sample) => sample.events.some((event) => event.type === 'reveal'))).toBe(true);
		const builder = fs.readFileSync(path.join(repoRoot, 'apps/locked/src/game/builder.json'), 'utf8');
		expect(builder).not.toContain('event-catalogue');
	});

	it('reads a specific round back out of the zstd book', () => {
		const rounds = JSON.parse(fs.readFileSync(path.join(devDir, 'builder_rounds.json'), 'utf8')) as {
			modes: { base: { rounds: { id: number }[] } };
		};
		const id = rounds.modes.base.rounds[0]!.id;
		const round = readRound(path.join(repoRoot, 'apps/locked/fixtures/books'), 'base', id);
		expect(round?.id).toBe(id);
		expect(round?.events[0]?.type).toBeTruthy();
	});

	it('announces every event and gates win bindings on cash > 0', async () => {
		clearBookBindings();
		const seen: string[] = [];
		const fired: string[] = [];
		bindBookEvent({
			event: 'winInfo',
			win: true,
			fn: (event) => {
				fired.push(`winInfo:${winCash(event)}`);
			},
		});
		bindBookEvent({
			event: 'setWin',
			win: true,
			fn: (event) => {
				fired.push(`setWin:${winCash(event)}`);
			},
		});
		const { onBookEvent } = await import('../src/events/play-book');
		onBookEvent((announcement) => seen.push(`${announcement.name}#${announcement.index}`));

		const zero: BookEvent = { type: 'winInfo', index: 3, totalWin: 0, wins: [] };
		const paid: BookEvent = { type: 'winInfo', index: 4, totalWin: 50, wins: [] };
		const quiet: BookEvent = { type: 'setWin', index: 5, amount: 0, winLevel: 1 };
		const loud: BookEvent = { type: 'setWin', index: 6, amount: 50, winLevel: 2 };
		expect(winBindingAllowed(zero)).toBe(false);
		expect(winBindingAllowed(paid)).toBe(true);
		await playBookEvents([zero, paid, quiet, loud]);
		expect(fired).toEqual(['winInfo:50', 'setWin:50']);
		expect(seen).toEqual(['winInfo#3', 'winInfo#4', 'setWin#5', 'setWin#6']);
		clearBookBindings();
	});

	it('does not wait in the default mode, and does wait when a binding must finish', async () => {
		clearBookBindings();
		let landed = false;
		bindBookEvent({
			event: 'reveal',
			fn: () =>
				new Promise((resolve) => {
					setTimeout(() => {
						landed = true;
						resolve();
					}, 30);
				}),
		});
		await playBookEvent({ type: 'reveal', index: 0 });
		expect(landed).toBe(false);

		let finished = false;
		bindBookEvent({
			event: 'reveal',
			await: true,
			fn: () =>
				new Promise((resolve) => {
					setTimeout(() => {
						finished = true;
						resolve();
					}, 20);
				}),
		});
		await playBookEvent({ type: 'reveal', index: 1 });
		expect(finished).toBe(true);
		clearBookBindings();
	});

	it('maps degen_spin onto the degen mood', () => {
		expect(moodForMode('degen_spin')).toBe('degen');
		expect(moodForMode('base')).toBe('base');
		expect(moodForMode('bonus')).toBe('3s');
	});
});
