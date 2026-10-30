<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'LOCKED/expanding wild',
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
		contrabandCToH3,
		contrabandL2ToH4,
		fireFramesPlacedOpen,
		newExpandingWildsCompat,
		newExpandingWildsShort,
		revealWithCOnly,
		revealWithEw,
		revealWithEwShortReel,
		revealWithFireAndLow,
		updateGridWithFire,
		wildUpgradeStayW,
		revealWithWild,
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
	name="EW expand then multiplier"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithEw, newExpandingWildsCompat]);
		},
	})}
	{template}
/>

<Story
	name="EW expand 3-row then multiplier"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithEwShortReel, newExpandingWildsShort]);
		},
	})}
	{template}
/>

<Story
	name="fire frames then land"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([fireFramesPlacedOpen, updateGridWithFire, revealWithFireAndLow]);
		},
	})}
	{template}
/>

<Story
	name="contraband swap"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([
				fireFramesPlacedOpen,
				updateGridWithFire,
				revealWithFireAndLow,
				contrabandL2ToH4,
			]);
		},
	})}
	{template}
/>

<Story
	name="contraband C only"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([
				fireFramesPlacedOpen,
				updateGridWithFire,
				revealWithCOnly,
				contrabandCToH3,
			]);
		},
	})}
	{template}
/>

<Story
	name="legacy chooser stays W"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			await playBookEvents([revealWithWild, wildUpgradeStayW]);
		},
	})}
	{template}
/>
