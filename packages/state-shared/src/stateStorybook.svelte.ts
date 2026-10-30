/**
 * Storybook-only hook: when set, in-game Spin uses this instead of the RGS.
 * StoryGameTemplate registers the green Action handler here.
 */
export const stateStorybook = $state({
	play: null as null | (() => Promise<void>),
	/** True while a local Storybook book/action is running (spin should show spin_active). */
	playing: false,
});
