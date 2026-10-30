/**
 * Seam for a shared cue map from the event file.
 * That file is not in the repo yet — do not invent entries.
 * When it lands, load it here and the log can compare rows against it.
 */
export type SharedCueMap = {
	events: Record<string, { silent?: boolean; cues: string[] }>;
};

export async function loadSharedCueMap(): Promise<SharedCueMap | null> {
	return null;
}
