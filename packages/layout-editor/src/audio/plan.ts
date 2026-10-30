/**
 * Book-event → cue planner. One playback path.
 * Win bindings stay closed unless the cash field is greater than 0.
 * The same cue inside 50ms is a double-fire and is not played again.
 * Until the player is unlocked, the caller plays nothing and queues nothing.
 */
import { winBindingAllowed, type BookEvent } from '../events/play-book';

export type AudioChannel = 'music' | 'sfx' | 'jingle';

export type AudioFile = {
	channel?: AudioChannel;
	gainDb?: number;
	loop?: boolean;
	placeholder?: boolean;
	startMs?: number;
	durationMs?: number;
	peakDb?: number;
};

export type AudioBinding = {
	cue?: string;
	on?: 'once' | 'perItem' | 'perReelStop';
	delayMs?: number;
	staggerMs?: number;
	maxVoices?: number;
	duckMusicDb?: number;
	syncTo?: string;
};

export type MixRow = { musicDb?: number; sfxDb?: number; jingleDb?: number };

export type AudioSection = {
	version?: number;
	placeholders?: boolean;
	sprite?: { src?: string; fallback?: string; map?: string; peakDb?: number };
	files?: Record<string, AudioFile>;
	events?: Record<string, AudioBinding[]>;
	silent?: string[];
	winlevels?: Record<string, string>;
	music?: Record<string, { cue?: string; crossfadeMs?: number }>;
	mix?: { phone?: MixRow; desktop?: MixRow };
	rules?: { maxConcurrentSfx?: number };
};

export type ScheduledCue = {
	cue: string;
	atMs: number;
	channel: AudioChannel;
	loop: boolean;
	gain: number;
	duckMusicDb?: number;
};

export type AudioIssue = {
	level: 'error' | 'warning' | 'ok';
	code: string;
	message: string;
};

const SFX_LIMIT = 300 * 1024;
const MUSIC_LIMIT = 2.5 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asAudioSection(value: unknown): AudioSection {
	return isRecord(value) ? (value as AudioSection) : {};
}

export function channelGain(mix: MixRow | undefined, channel: AudioChannel, fileGainDb = 0): number {
	const row = mix ?? {};
	const bus = channel === 'music' ? (row.musicDb ?? 0) : channel === 'jingle' ? (row.jingleDb ?? 0) : (row.sfxDb ?? 0);
	return 10 ** ((bus + fileGainDb) / 20);
}

export function sizeWarning(bytes: number, channel: AudioChannel): string | null {
	if (channel === 'music' && bytes > MUSIC_LIMIT) return `music file is over 2.5 MB (${bytes} bytes)`;
	if (channel !== 'music' && bytes > SFX_LIMIT) return `sfx file is over 300 KB (${bytes} bytes)`;
	return null;
}

export function peakWarning(peakDb: number): string | null {
	if (peakDb > -1) return `peak ${peakDb} dBFS is above -1 dBFS`;
	return null;
}

function countOf(event: BookEvent, keys: string[]): number {
	for (const key of keys) {
		const value = event[key];
		if (Array.isArray(value) && value.length > 0) return value.length;
	}
	return 1;
}

function hitsFor(binding: AudioBinding, event: BookEvent): number {
	if (binding.on === 'perItem') return countOf(event, ['positions', 'newPositions', 'newWilds', 'explodingSymbols', 'wins']);
	if (binding.on === 'perReelStop') {
		if (Array.isArray(event.board) && event.board.length > 0) return event.board.length;
		return 1;
	}
	return 1;
}

export function createCueLog() {
	const last = new Map<string, number>();
	const doubleFires: string[] = [];
	return {
		doubleFires,
		/** false = this play is a double-fire and must be dropped. */
		accept(cue: string, atMs: number): boolean {
			const prev = last.get(cue);
			if (prev !== undefined && atMs - prev < 50) {
				doubleFires.push(`${cue} at ${atMs}ms`);
				return false;
			}
			last.set(cue, atMs);
			return true;
		},
	};
}

export function scheduleBookCues(
	audio: AudioSection,
	event: BookEvent,
	nowMs: number,
	log = createCueLog(),
	device: 'phone' | 'desktop' = 'desktop',
): ScheduledCue[] {
	if ((event.type === 'winInfo' || event.type === 'setWin') && !winBindingAllowed(event)) return [];
	const files = audio.files ?? {};
	const mix = audio.mix?.[device];
	const cap = audio.rules?.maxConcurrentSfx ?? 6;
	const planned: ScheduledCue[] = [];
	const rows = audio.events?.[event.type] ?? [];
	let sfxVoices = 0;

	const push = (cueName: string, atMs: number, duckMusicDb?: number) => {
		const file = files[cueName];
		if (!file) return;
		const channel: AudioChannel = file.channel === 'music' || file.channel === 'jingle' ? file.channel : 'sfx';
		if (channel === 'sfx') {
			sfxVoices += 1;
			if (sfxVoices > cap) return;
		}
		if (!log.accept(cueName, atMs)) return;
		planned.push({
			cue: cueName,
			atMs,
			channel,
			loop: file.loop === true,
			gain: channelGain(mix, channel, file.gainDb ?? 0),
			duckMusicDb,
		});
	};

	for (const binding of rows) {
		if (!binding?.cue) continue;
		const hits = hitsFor(binding, event);
		const limited = binding.maxVoices !== undefined ? Math.min(hits, binding.maxVoices) : hits;
		const step = binding.on === 'once' ? 0 : (binding.staggerMs ?? (binding.on === 'perReelStop' ? 80 : 0));
		for (let index = 0; index < limited; index += 1) {
			push(binding.cue, nowMs + (binding.delayMs ?? 0) + index * step, binding.duckMusicDb);
		}
	}

	if (event.type === 'setWin') {
		const level = event.winLevel;
		const cue = typeof level === 'number' ? audio.winlevels?.[String(level)] : undefined;
		if (cue) push(cue, nowMs);
	}
	return planned;
}

export function playRoundCues(
	audio: AudioSection,
	events: BookEvent[],
	device: 'phone' | 'desktop' = 'desktop',
): { cues: ScheduledCue[]; doubleFires: string[] } {
	const log = createCueLog();
	const cues: ScheduledCue[] = [];
	events.forEach((event, index) => {
		cues.push(...scheduleBookCues(audio, event, index * 200, log, device));
	});
	return { cues, doubleFires: log.doubleFires };
}

export function musicForMode(audio: AudioSection, mode: string): { cue: string; crossfadeMs: number } | null {
	const music = audio.music ?? {};
	const key = mode === 'degen_spin' || mode === 'degen' ? 'degen_spin' : mode === 'base' ? 'base' : 'bonus';
	const row = music[key];
	if (!row?.cue) return null;
	return { cue: row.cue, crossfadeMs: row.crossfadeMs ?? 0 };
}

/** Missing cues. contrabandSwap and winLevels 1–9 are errors. A marked silent event is ok. */
export function audioFindings(audio: AudioSection, eventTypes: string[]): AudioIssue[] {
	const issues: AudioIssue[] = [];
	const silent = new Set(audio.silent ?? []);
	const files = audio.files ?? {};
	const used = new Set<string>();

	for (const type of eventTypes) {
		if (type === 'setWin') {
			for (let level = 1; level <= 9; level += 1) {
				const cue = audio.winlevels?.[String(level)];
				if (!cue || !files[cue]) {
					issues.push({ level: 'error', code: 'winlevel', message: `winLevel ${level} has no cue` });
				} else used.add(cue);
			}
			continue;
		}
		const rows = audio.events?.[type];
		const bound = (rows ?? []).filter((row) => row.cue && files[row.cue]);
		for (const row of bound) {
			if (row.cue) used.add(row.cue);
		}
		if (bound.length > 0) continue;
		if (silent.has(type) || (Array.isArray(rows) && rows.length === 0)) {
			issues.push({ level: 'ok', code: 'silent', message: `${type} is deliberately silent` });
			continue;
		}
		issues.push({
			level: type === 'contrabandSwap' ? 'error' : 'warning',
			code: 'missing',
			message: `${type} has no cue`,
		});
	}

	for (const [cue, file] of Object.entries(files)) {
		if (!used.has(cue) && file.channel !== 'music') {
			const musicCues = new Set(Object.values(audio.music ?? {}).map((row) => row.cue).filter(Boolean));
			if (!musicCues.has(cue)) {
				issues.push({ level: 'warning', code: 'unused', message: `${cue} is unused` });
			}
		}
		if (typeof file.peakDb === 'number') {
			const loud = peakWarning(file.peakDb);
			if (loud) issues.push({ level: 'warning', code: 'loud', message: `${cue}: ${loud}` });
		}
	}

	for (const row of Object.values(audio.events ?? {}).flat()) {
		if (row.cue && !files[row.cue]) {
			issues.push({ level: 'error', code: 'dangling', message: `${row.cue} is not in the sprite` });
		}
	}

	if (typeof audio.sprite?.peakDb === 'number') {
		const loud = peakWarning(audio.sprite.peakDb);
		if (loud) issues.push({ level: 'warning', code: 'loud', message: `sprite: ${loud}` });
	}
	return issues;
}
