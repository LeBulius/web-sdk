<script lang="ts">
	import type { Snippet } from 'svelte';

	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { FadeContainer } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import { getContext } from '../context';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	let show = $state(true);
	let oncomplete = $state(() => {});

	const closeMenus = () => {
		stateUi.menuOpen = false;
		stateUi.betMenuOpen = false;
		stateUi.autoplayMenuOpen = false;
	};

	/** Resolve must be set before toggling show — FadeContainer's $effect can flush on show change. */
	const fadeTo = async (next: boolean) => {
		if (show === next) return;
		if (!next) closeMenus();
		const faded = waitForResolve((resolve) => {
			oncomplete = resolve;
		});
		show = next;
		await Promise.race([faded, waitForTimeout(500)]);
	};

	context.eventEmitter.subscribeOnMount({
		uiShow: async () => fadeTo(true),
		uiHide: async () => fadeTo(false),
	});
</script>

<FadeContainer persistent {show} {oncomplete}>
	{@render props.children()}
</FadeContainer>
