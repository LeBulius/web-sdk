<script lang="ts">
	import { i18n, type Messages } from "@lingui/core";
	import { onMount, type Snippet } from "svelte";

	import { stateModal, type Language } from 'state-shared';

	type Props = {
		lang: Language;
		children: Snippet;
		/** Optional catalog; empty object keeps stories from leaking the previous locale. */
		messages?: Messages;
	};

	const props: Props = $props();

	onMount(async () => {
		// Shared state persists across Storybook stories; clear sticky errors on switch.
		stateModal.modal = null;
		i18n.load(props.lang, props.messages ?? {});
		i18n.activate(props.lang);
	});
</script>

{@render props.children()}
