import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { validateBindings } from '../src/events/catalogue';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const locked = path.join(repoRoot, 'apps/locked');

const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(locked, rel), 'utf8')) as Record<string, unknown>;

describe('phase 7 binding check', () => {
	const builder = read('src/game/builder.json');
	const catalogue = read('dev/event-catalogue.json');
	const rounds = read('dev/builder_rounds.json');

	it('stays unavailable until a catalogue is passed, then accepts the demo', () => {
		expect(validateBindings()).toEqual({ available: false, reason: 'not available' });
		const result = validateBindings({ builder, catalogue, rounds });
		expect(result.available).toBe(true);
		if (!('issues' in result)) throw new Error('expected issues');
		expect(result.issues.filter((issue) => issue.level === 'error')).toEqual([]);
		const logo = result.issues.find((issue) => issue.message.startsWith('screen_logo'));
		expect(logo).toMatchObject({ level: 'ok', code: 'static-fallback' });
	});

	it('rejects a legacy event and a double-fired cue, and keeps a static slot ok', () => {
		const spine = structuredClone(builder.spine) as { eventMap: { bookEvent: string }[] };
		spine.eventMap.push({ bookEvent: 'wildUpgrade', skeleton: 'spineboy', anim: 'idle', target: 'global' });
		const legacy = validateBindings({ builder: { ...builder, spine }, catalogue, rounds });
		if (!legacy || !('issues' in legacy)) throw new Error('expected issues');
		expect(legacy.issues.some((issue) => issue.code === 'invalid-binding' && issue.message.includes('wildUpgrade'))).toBe(true);

		const audio = structuredClone(builder.audio) as {
			events: Record<string, { cue: string; on: string; staggerMs?: number }[]>;
		};
		audio.events.fireFramesPlaced = [{ cue: 'sfx_fire_place', on: 'perItem', staggerMs: 0 }];
		const doubled = validateBindings({
			builder: { ...builder, audio },
			catalogue,
			rounds: { modes: { base: { samples: [{ id: 1, events: [{ type: 'fireFramesPlaced', index: 0, positions: [{}, {}] }] }] } } },
		});
		if (!doubled || !('issues' in doubled)) throw new Error('expected issues');
		expect(doubled.issues.some((issue) => issue.code === 'double-fire')).toBe(true);
		expect(doubled.issues.some((issue) => issue.level === 'error' && issue.code === 'static-fallback')).toBe(false);
	});
});
