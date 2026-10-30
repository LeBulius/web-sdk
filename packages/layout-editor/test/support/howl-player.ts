// Vendored for tests from visual-builder 84eace1 packages/utils-sound/src/player.ts (unchanged below).
/**
 * Thin Howler stand-in. The real utils-sound package replaces this file.
 * Nothing plays until unlock(). Calls before that are dropped, not queued.
 */
export type HowlLike = {
	play: (sprite?: string) => number;
	volume: (volume: number, id?: number) => void;
	loop: (loop: boolean, id?: number) => void;
	stop: (id?: number) => void;
	fade?: (from: number, to: number, duration: number, id?: number) => void;
};

export type PlayerCue = {
	cue: string;
	channel: 'music' | 'sfx' | 'jingle';
	loop: boolean;
	gain: number;
	duckMusicDb?: number;
};

export type PlayResult = { played: true; id: number } | { played: false; reason: 'locked' };

export function createPlayer(
	loader: (src: string[], sprite: Record<string, [number, number]>) => HowlLike,
) {
	let unlocked = false;
	let howl: HowlLike | null = null;
	let musicId: number | null = null;
	let musicGain = 1;
	let sfxGain = 1;

	return {
		get unlocked() {
			return unlocked;
		},
		unlock(src: string[], sprite: Record<string, [number, number]>) {
			unlocked = true;
			if (!howl) howl = loader(src, sprite);
		},
		setGains(music: number, sfx: number) {
			musicGain = music;
			sfxGain = sfx;
			if (howl && musicId !== null) howl.volume(musicGain, musicId);
		},
		play(cue: PlayerCue): PlayResult {
			if (!unlocked || !howl) return { played: false, reason: 'locked' };
			const id = howl.play(cue.cue);
			howl.volume(cue.gain, id);
			if (cue.loop) howl.loop(true, id);
			if (cue.channel === 'music') {
				if (musicId !== null) howl.stop(musicId);
				musicId = id;
			}
			if (cue.duckMusicDb !== undefined && musicId !== null && howl.fade) {
				const ducked = musicGain * 10 ** (cue.duckMusicDb / 20);
				howl.fade(musicGain, ducked, 80, musicId);
			}
			return { played: true, id };
		},
		stop() {
			howl?.stop();
			musicId = null;
		},
	};
}
