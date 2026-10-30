<script lang="ts">
	import type { Snippet } from 'svelte';
	import { StoryLocale } from 'components-storybook';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const { children }: Props = $props();
</script>

<StoryLocale lang="en" messages={messagesMap.en}>
	{@render children()}
</StoryLocale>
