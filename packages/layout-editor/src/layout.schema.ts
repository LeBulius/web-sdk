/**
 * Runtime prop types shared with pixi-svelte.
 *
 * Storage lives in builder.json (see builder.schema.ts). These types are the
 * PIXI-shaped values `useLayout` / `resolveLayout` / `defineTunable` still
 * return, so game code keeps the starter signatures.
 *
 * The starter's four layout types and the `"*"` bucket are gone. Viewport
 * keys are the seven Stake sizes in builder.schema.ts.
 */

export type PointLike = number | { x: number; y: number };

export type NodeProps = {
	x?: number;
	y?: number;
	scale?: PointLike;
	anchor?: PointLike;
	pivot?: PointLike;
	rotation?: number;
	alpha?: number;
	visible?: boolean;
	zIndex?: number;
	/** Sprite size (px, parent space). Mapped from builder.json item w/h only for nodes that list them as editable. */
	width?: number;
	height?: number;
};

export type NodePropKey = keyof NodeProps;

export const NODE_PROP_KEYS: readonly NodePropKey[] = [
	'x',
	'y',
	'scale',
	'anchor',
	'pivot',
	'rotation',
	'alpha',
	'visible',
	'zIndex',
	'width',
	'height',
] as const;

/** Applied when an override is removed but the formula does not provide the key. width/height have no neutral value. */
export const NEUTRAL_PROPS: Required<Omit<NodeProps, 'width' | 'height'>> = {
	x: 0,
	y: 0,
	scale: 1,
	anchor: 0,
	pivot: 0,
	rotation: 0,
	alpha: 1,
	visible: true,
	zIndex: 0,
};
