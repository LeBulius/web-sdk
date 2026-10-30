/** Pure snapping helpers (all values in the node's PARENT local space). */

export type SnapAxisResult = { value: number; guide?: number };

/**
 * Snap `value` to the nearest target within `threshold`; otherwise optionally to a grid.
 * Returns the guide line (target) that was hit so the overlay can draw it.
 */
export function snapAxis(
	value: number,
	targets: number[],
	threshold: number,
	grid?: number,
): SnapAxisResult {
	let best: number | undefined;
	let bestDistance = threshold;
	for (const target of targets) {
		const distance = Math.abs(value - target);
		if (distance <= bestDistance) {
			best = target;
			bestDistance = distance;
		}
	}
	if (best !== undefined) return { value: best, guide: best };
	if (grid && grid > 0) return { value: Math.round(value / grid) * grid };
	return { value };
}

/** Edges + centre of a frame rectangle that starts at (0,0) in parent space. */
export const frameTargets = (size: number) => [0, size * 0.5, size];

export const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export const snapAngle = (radians: number, stepDegrees = 15) => {
	const step = (stepDegrees * Math.PI) / 180;
	return Math.round(radians / step) * step;
};
