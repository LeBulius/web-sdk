import type { SharedCueMap } from './cueMap';

export const DEV_PANEL_MARKER = 'locked-dev-panel-phase1' as const;

export type LogSnapshot = {
	marker: typeof DEV_PANEL_MARKER;
	cueMap: SharedCueMap | null;
	round: {
		mode: string;
		id: number | string;
		source: string;
		criteria: string;
		forced: boolean;
		forceApplied: boolean;
	} | null;
	rows: LogRow[];
};

export type CueKind = 'once' | 'music' | 'loop' | 'stop';

export type CueHit = {
	kind: CueKind;
	name: string;
	at: number;
};

export type CueFlag =
	| { kind: 'no-cue'; silent: boolean }
	| { kind: 'repeat'; name: string; count: number; expected: boolean };

export type LogRow = {
	id: number;
	at: number;
	index: number;
	type: string;
	cues: CueHit[];
	flags: CueFlag[];
};

/** Known-silent book events: a missing cue is info, not a fault. */
export const KNOWN_SILENT_EVENTS = new Set([
	'setTotalWin',
	'updateFreeSpin',
	'finalWin',
	'tumbleBoard',
]);

/** Button UI cues stay out of book-event rows. */
export const BUTTON_CUE_NAMES = new Set(['sfx_btn_general', 'sfx_btn_spin']);

export const REEL_STOP_CUE = 'sfx_reel_stop_1';

const REEL_STOP_EVENTS = new Set(['reveal', 'tumbleBoard']);

export function flagsFor(type: string, cues: { name: string }[]): CueFlag[] {
	if (!cues.length) {
		return [{ kind: 'no-cue', silent: KNOWN_SILENT_EVENTS.has(type) }];
	}

	const counts = new Map<string, number>();
	for (const cue of cues) counts.set(cue.name, (counts.get(cue.name) ?? 0) + 1);

	const flags: CueFlag[] = [];
	for (const [name, count] of counts) {
		if (count < 2) continue;
		const expected = name === REEL_STOP_CUE && REEL_STOP_EVENTS.has(type);
		flags.push({ kind: 'repeat', name, count, expected });
	}
	return flags;
}

export function groupCues(cues: CueHit[]): { kind: CueKind; name: string; count: number }[] {
	const groups: { kind: CueKind; name: string; count: number }[] = [];
	for (const cue of cues) {
		const last = groups[groups.length - 1];
		if (last && last.kind === cue.kind && last.name === cue.name) last.count += 1;
		else groups.push({ kind: cue.kind, name: cue.name, count: 1 });
	}
	return groups;
}

export function flagLabel(flag: CueFlag, reelCount = 0): string {
	if (flag.kind === 'no-cue') return flag.silent ? 'no cue (silent)' : 'no cue';
	if (flag.expected) {
		const reels = reelCount > 0 && flag.count === reelCount ? ' (one per reel)' : '';
		return `${flag.name} ×${flag.count} expected${reels}`;
	}
	return `repeat ${flag.name} ×${flag.count}`;
}

export function flagClass(flag: CueFlag): string {
	if (flag.kind === 'no-cue') return flag.silent ? 'flag flag-silent' : 'flag flag-info';
	return flag.expected ? 'flag flag-expected' : 'flag flag-repeat';
}
