<script lang="ts" module>
	/**
	 * Optional per-game hook (set by the game with setContext, e.g. layout-editor's useUiItem):
	 * returns a live offset/scale/visibility for a shared ui.json item id. No hook = no wrapper,
	 * so games that do not set it render exactly as before.
	 */
	export const UI_ITEM_HOOK = '@@layout-editor/ui-item';
	export type UiItemHook = (id: string) => {
		readonly props: { x: number; y: number; scale: number; visible: boolean; zIndex?: number; label: string };
	};
</script>

<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { Container } from 'pixi-svelte';

	type Props = { id: string; children: Snippet };

	const props: Props = $props();
	const hook = getContext<UiItemHook | undefined>(UI_ITEM_HOOK);
	// svelte-ignore state_referenced_locally
	const item = hook?.(props.id);
</script>

{#if item}
	<Container {...item.props}>
		{@render props.children()}
	</Container>
{:else}
	{@render props.children()}
{/if}
