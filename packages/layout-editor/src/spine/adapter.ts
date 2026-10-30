/**
 * Runtime visual adapter.
 *
 * A Spine binding is optional per item. When the skeleton or the atlas is
 * missing, the same slot renders the art-panel WebP at the same position,
 * anchor, and scale. This function does not throw. Event bindings on a
 * static item are no-ops. Adding a skeleton later flips the result to Spine
 * with no call-site change.
 */
import { ancestorChain, type ViewportKey } from '../builder.schema';
import { winBindingAllowed, type BookEvent } from '../events/play-book';
import { validateSpineSection, type SpineIssue } from './validate';

export const SPINE_TARGETS = [
	'eachRevealedSymbol',
	'winningPositions',
	'swappedPositions',
	'expandedReels',
	'global',
] as const;

export type SpineTarget = (typeof SPINE_TARGETS)[number];

/** Keys that are maps, not skeleton records. */
export const SPINE_META_KEYS = new Set([
	'eventMap',
	'placements',
	'items',
	'symbolSkins',
	'symbolStates',
	'skeletons',
]);

export type SlotPose = {
	x: number;
	y: number;
	anchor: [number, number];
	scale: number;
};

export type ResolvedVisual = {
	kind: 'spine' | 'static';
	id: string;
	x: number;
	y: number;
	anchor: [number, number];
	scale: number;
	/** Art-panel WebP, relative to src/assets/builder. Empty when the slot has no still. */
	texture: string;
	skeletonKey: string | null;
	skeleton?: string;
	atlas?: string;
	pma?: boolean;
	version?: string;
	animations?: string[];
};

export type VisualEventResult = {
	applied: boolean;
	mode: 'spine' | 'noop';
	anim?: string;
	skeleton?: string;
	reason?: 'static' | 'no-anim' | 'unknown-anim' | 'win-gate';
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSkeletonRecord(value: unknown): value is Record<string, unknown> {
	if (!isRecord(value)) return false;
	return typeof value.skeleton === 'string' && value.skeleton.length > 0 && typeof value.atlas === 'string' && value.atlas.length > 0;
}

function skeletonTable(spine: Record<string, unknown>): Record<string, unknown> | null {
	return isRecord(spine.skeletons) ? spine.skeletons : null;
}

/** The skeleton key an item is bound to, or null when the item stays static. */
export function boundSkeletonKey(spine: Record<string, unknown>, id: string): string | null {
	if (isSkeletonRecord(spine[id])) return id;
	const nested = skeletonTable(spine);
	if (nested && isSkeletonRecord(nested[id])) return id;
	const items = spine.items;
	if (!isRecord(items)) return null;
	const binding = items[id];
	if (!isRecord(binding) || typeof binding.skeleton !== 'string' || !binding.skeleton) return null;
	const key = binding.skeleton;
	if (isSkeletonRecord(spine[key])) return key;
	if (nested && isSkeletonRecord(nested[key])) return key;
	return null;
}

export function spineRecordFor(spine: Record<string, unknown>, id: string): Record<string, unknown> | null {
	const key = boundSkeletonKey(spine, id);
	if (!key) return null;
	if (isSkeletonRecord(spine[key])) return spine[key];
	const nested = skeletonTable(spine);
	if (nested && isSkeletonRecord(nested[key])) return nested[key];
	return null;
}

export function staticTexture(art: Record<string, unknown>, id: string): string {
	const slots = art.slots;
	if (isRecord(slots)) {
		const slot = slots[id];
		if (isRecord(slot) && typeof slot.src === 'string') return slot.src;
	}
	const direct = art[id];
	if (isRecord(direct) && typeof direct.src === 'string') return direct.src;
	return '';
}

function readAnchor(value: unknown): [number, number] | null {
	if (!Array.isArray(value) || value.length !== 2) return null;
	const [x, y] = value;
	if (typeof x !== 'number' || typeof y !== 'number') return null;
	return [x, y];
}

function artAnchor(art: Record<string, unknown>, id: string): [number, number] | null {
	const slots = art.slots;
	if (!isRecord(slots) || !isRecord(slots[id])) return null;
	return readAnchor(slots[id].anchor);
}

function readPose(value: unknown): Partial<SlotPose> | null {
	if (!isRecord(value)) return null;
	const pose: Partial<SlotPose> = {};
	if (typeof value.x === 'number') pose.x = value.x;
	if (typeof value.y === 'number') pose.y = value.y;
	if (typeof value.scale === 'number') pose.scale = value.scale;
	const anchor = readAnchor(value.anchor);
	if (anchor) pose.anchor = anchor;
	return pose;
}

/** Active key, then its fallback chain. Only the seven Stake keys are read. */
export function placementPose(spine: Record<string, unknown>, id: string, viewport: ViewportKey): Partial<SlotPose> | null {
	if (!isRecord(spine.placements) || !isRecord(spine.placements[id])) return null;
	const spec = spine.placements[id];
	const chain = [...ancestorChain(viewport)].reverse();
	for (const key of chain) {
		const pose = readPose(spec[key]);
		if (pose) return pose;
	}
	return null;
}

export function resolveVisual(input: {
	id: string;
	spine: Record<string, unknown>;
	art: Record<string, unknown>;
	viewport?: ViewportKey;
	pose?: Partial<SlotPose>;
}): ResolvedVisual {
	const record = spineRecordFor(input.spine, input.id);
	const placed = input.viewport ? placementPose(input.spine, input.id, input.viewport) : null;
	const anchor = input.pose?.anchor ?? placed?.anchor ?? artAnchor(input.art, input.id) ?? [0.5, 0.5];
	const scale = input.pose?.scale ?? placed?.scale ?? (record && typeof record.scale === 'number' ? record.scale : 1);
	const pose: SlotPose = {
		x: input.pose?.x ?? placed?.x ?? 0,
		y: input.pose?.y ?? placed?.y ?? 0,
		anchor,
		scale,
	};
	const texture = staticTexture(input.art, input.id);
	const skeletonKey = boundSkeletonKey(input.spine, input.id);
	if (!record || !skeletonKey) {
		return { kind: 'static', id: input.id, ...pose, texture, skeletonKey: null };
	}
	const animations = Array.isArray(record.animations)
		? record.animations.filter((name): name is string => typeof name === 'string')
		: undefined;
	return {
		kind: 'spine',
		id: input.id,
		...pose,
		texture,
		skeletonKey,
		skeleton: record.skeleton as string,
		atlas: record.atlas as string,
		pma: record.pma === true,
		version: typeof record.version === 'string' ? record.version : undefined,
		animations,
	};
}

/** Play a bound animation. A static item returns a no-op and does not throw. */
export function applyVisualEvent(visual: ResolvedVisual, request: { anim?: string } = {}): VisualEventResult {
	if (visual.kind === 'static') return { applied: false, mode: 'noop', reason: 'static' };
	const anim = request.anim;
	if (!anim) return { applied: false, mode: 'noop', reason: 'no-anim' };
	if (visual.animations && !visual.animations.includes(anim)) {
		return { applied: false, mode: 'noop', reason: 'unknown-anim', anim };
	}
	return { applied: true, mode: 'spine', anim, skeleton: visual.skeleton };
}

type EventRow = {
	bookEvent?: unknown;
	skeleton?: unknown;
	anim?: unknown;
};

/**
 * Run eventMap rows for one book event.
 * winInfo / setWin rows stay closed when the cash field is not greater than 0.
 * A static target no-ops. Nothing here throws.
 */
export function dispatchSpineBindings(
	event: BookEvent,
	spine: Record<string, unknown>,
	art: Record<string, unknown>,
	viewport?: ViewportKey,
): VisualEventResult[] {
	const map = Array.isArray(spine.eventMap) ? spine.eventMap : [];
	const results: VisualEventResult[] = [];
	for (const entry of map) {
		if (!isRecord(entry)) continue;
		const row = entry as EventRow;
		if (row.bookEvent !== event.type) continue;
		const anim = typeof row.anim === 'string' ? row.anim : undefined;
		if ((event.type === 'winInfo' || event.type === 'setWin') && !winBindingAllowed(event)) {
			results.push({ applied: false, mode: 'noop', reason: 'win-gate', anim });
			continue;
		}
		const id = typeof row.skeleton === 'string' ? row.skeleton : '';
		const visual = resolveVisual({ id, spine, art, viewport });
		results.push(applyVisualEvent(visual, { anim }));
	}
	return results;
}

export function listVisualItems(art: Record<string, unknown>, spine: Record<string, unknown>, slotIds: string[]): ResolvedVisual[] {
	const ids = new Set(slotIds);
	for (const key of Object.keys(spine)) {
		if (SPINE_META_KEYS.has(key)) continue;
		if (isSkeletonRecord(spine[key])) ids.add(key);
	}
	if (isRecord(spine.items)) {
		for (const key of Object.keys(spine.items)) ids.add(key);
	}
	if (isRecord(spine.skeletons)) {
		for (const key of Object.keys(spine.skeletons)) {
			if (isSkeletonRecord(spine.skeletons[key])) ids.add(key);
		}
	}
	return [...ids]
		.sort()
		.map((id) => resolveVisual({ id, spine, art }));
}

/** Errors from the spine section, plus an ok finding for every static item. */
export function spineFindings(spine: unknown, art: Record<string, unknown>, itemIds: string[] = []): SpineIssue[] {
	const issues = validateSpineSection(spine);
	if (!isRecord(spine)) return issues;
	for (const visual of listVisualItems(art, spine, itemIds)) {
		if (visual.kind === 'static') {
			issues.push({
				level: 'ok',
				code: 'static-fallback',
				id: visual.id,
				message: `${visual.id} uses the static WebP`,
			});
		}
	}
	return issues;
}
