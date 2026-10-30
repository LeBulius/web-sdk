<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'LOCKED/feature screens',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import LockedStoryLocale from './LockedStoryLocale.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBookEvents } from '../game/utils';
	import {
		freeSpinEndNice,
		freeSpinTrigger8,
		revealWithEw,
		revealWithScatters,
		setWinBig,
		setWinSuper,
		tumbleReplaceLows,
	} from './data/expanding_wild_events';

	setContext();
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate
		skipLoadingScreen={args.skipLoadingScreen}
		action={async () => {
			await args.action?.(args.data);
		}}
	>
		<LockedStoryLocale>
			<Game />
		</LockedStoryLocale>
	</StoryGameTemplate>
{/snippet}

<Story
	name="bonus intro"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithScatters, freeSpinTrigger8]);
		},
	})}
	{template}
/>

<Story
	name="free spin outro"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithScatters, freeSpinTrigger8, freeSpinEndNice]);
		},
	})}
	{template}
/>

<Story
	name="big win"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithEw, setWinBig]);
		},
	})}
	{template}
/>

<Story
	name="super win"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithEw, setWinSuper]);
		},
	})}
	{template}
/>

<Story
	name="tumble only"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithEw, tumbleReplaceLows]);
		},
	})}
	{template}
/>
