import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	audioFindings,
	channelGain,
	musicForMode,
	peakWarning,
	playRoundCues,
	scheduleBookCues,
	sizeWarning,
} from '../src/audio/plan';
import { validateBuilderFile } from '../src/builder.schema';
import { createPlayer } from 'utils-sound/player';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const locked = path.join(repoRoot, 'apps/locked');

describe('phase 6 audio sprite', () => {
	const builder = JSON.parse(fs.readFileSync(path.join(locked, 'src/game/builder.json'), 'utf8')) as {
		audio: Parameters<typeof audioFindings>[0];
	};
	const catalogue = JSON.parse(fs.readFileSync(path.join(locked, 'dev/event-catalogue.json'), 'utf8')) as {
		events: { type: string }[];
	};
	const types = catalogue.events.map((event) => event.type);

	it('ships one sprite, keeps wav originals out of the output tree, and marks placeholders', () => {
		expect(builder.audio.placeholders).toBe(true);
		expect(builder.audio.sprite?.src).toBe('audio/sprite/sprite.m4a');
		expect(builder.audio.sprite?.fallback).toBe('audio/sprite/sprite.ogg');
		expect(fs.existsSync(path.join(locked, 'src/assets/builder/audio/sprite/sprite.m4a'))).toBe(true);
		expect(fs.existsSync(path.join(locked, 'src/assets/builder/audio/sprite/sprite.ogg'))).toBe(true);
		expect(fs.existsSync(path.join(locked, 'assets-src/audio/sfx_contraband_swap/sfx_contraband_swap.wav'))).toBe(true);
		const output = path.join(locked, 'src/assets/builder');
		const walk = (dir: string): string[] =>
			fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const next = path.join(dir, entry.name);
				return entry.isDirectory() ? walk(next) : [next];
			});
		expect(walk(output).some((file) => file.endsWith('.wav'))).toBe(false);
		expect(validateBuilderFile(builder)).toEqual([]);
		expect(peakWarning(builder.audio.sprite?.peakDb ?? 0)).toBeNull();
		expect(sizeWarning(fs.statSync(path.join(locked, 'src/assets/builder/audio/sprite/sprite.m4a')).size, 'music')).toBeNull();
	});

	it('covers every catalogue event with a cue or a deliberate silence, including winLevels 1–9', () => {
		const findings = audioFindings(builder.audio, types);
		expect(findings.filter((issue) => issue.level === 'error')).toEqual([]);
		expect(findings.some((issue) => issue.code === 'silent' && issue.message.startsWith('updateGrid'))).toBe(true);
		expect(builder.audio.winlevels?.['1']).toBe('jng_win_lvl1');
		expect(builder.audio.winlevels?.['9']).toBe('jng_win_lvl9');
	});

	it('gates wins, spaces reel stops, and plays a round without a double-fire', () => {
		expect(scheduleBookCues(builder.audio, { type: 'winInfo', index: 0, totalWin: 0 }, 0)).toEqual([]);
		expect(scheduleBookCues(builder.audio, { type: 'setWin', index: 1, amount: 0, winLevel: 4 }, 0)).toEqual([]);
		const win = scheduleBookCues(builder.audio, { type: 'setWin', index: 2, amount: 50, winLevel: 4 }, 0);
		expect(win.map((cue) => cue.cue)).toContain('jng_win_lvl4');
		const stops = scheduleBookCues(builder.audio, { type: 'reveal', index: 3, board: [[], [], [], [], []] }, 0);
		expect(stops).toHaveLength(5);
		expect(stops[1]!.atMs - stops[0]!.atMs).toBe(80);
		const round = playRoundCues(builder.audio, [
			{ type: 'reveal', index: 0, board: [[], [], [], [], []] },
			{ type: 'fireFramesPlaced', index: 1, positions: [{}, {}, {}] },
			{ type: 'contrabandSwap', index: 2 },
			{ type: 'winInfo', index: 3, totalWin: 20 },
			{ type: 'setWin', index: 4, amount: 20, winLevel: 3 },
			{ type: 'tumbleBoard', index: 5 },
			{ type: 'freeSpinTrigger', index: 6 },
			{ type: 'freeSpinRetrigger', index: 7 },
			{ type: 'winInfo', index: 8, totalWin: 0 },
			{ type: 'updateGrid', index: 9 },
		]);
		expect(round.doubleFires).toEqual([]);
		expect(round.cues.some((cue) => cue.cue === 'sfx_contraband_swap')).toBe(true);
		expect(round.cues.some((cue) => cue.cue === 'sfx_win_small')).toBe(true);
		expect(round.cues.filter((cue) => cue.cue === 'sfx_win_small')).toHaveLength(1);
	});

	it('uses a different bus on phone and desktop, and drops audio before unlock', () => {
		const phone = channelGain(builder.audio.mix?.phone, 'music');
		const desktop = channelGain(builder.audio.mix?.desktop, 'music');
		expect(phone).toBeLessThan(desktop);
		expect(channelGain(builder.audio.mix?.phone, 'sfx')).not.toBe(channelGain(builder.audio.mix?.desktop, 'sfx'));
		expect(musicForMode(builder.audio, 'degen')?.cue).toBe('bgm_degen');
		expect(musicForMode(builder.audio, 'bonus')?.cue).toBe('bgm_fs');
		const played: string[] = [];
		const player = createPlayer(() => ({
			play: (cue) => {
				played.push(cue ?? '');
				return played.length;
			},
			volume: () => undefined,
			loop: () => undefined,
			stop: () => undefined,
		}));
		expect(player.play({ cue: 'bgm_base', channel: 'music', loop: true, gain: 1 })).toEqual({
			played: false,
			reason: 'locked',
		});
		expect(played).toEqual([]);
		player.unlock(['sprite.m4a'], { bgm_base: [0, 1000] });
		expect(player.play({ cue: 'bgm_base', channel: 'music', loop: true, gain: phone }).played).toBe(true);
		expect(played).toEqual(['bgm_base']);
	});

	it('leaves no hand-written cue calls in the game source', () => {
		const src = path.join(locked, 'src');
		const files: string[] = [];
		const walk = (dir: string) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const next = path.join(dir, entry.name);
				if (entry.isDirectory()) walk(next);
				else if (/\.(ts|js|svelte)$/.test(entry.name)) files.push(next);
			}
		};
		walk(src);
		const joined = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
		expect(joined).not.toMatch(/\b(sfx_|bgm_|jng_)[A-Za-z0-9_]+/);
	});
});
