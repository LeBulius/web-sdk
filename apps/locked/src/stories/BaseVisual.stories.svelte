<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'LOCKED/Base Visual',
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
	import { stateGame } from '../game/stateGame.svelte';

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
	name="idle board"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
	})}
	{template}
/>

<Story
	name="loading screen"
	args={templateArgs({
		skipLoadingScreen: false,
		data: {},
	})}
	{template}
/>

<Story
	name="multipliers after tumbles"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.positionMultipliers = [
				[1, 2, 1],
				[1, 3, 1, 2, 1],
				[2, 1, 4, 1, 2],
				[1, 1, 3],
			];
		},
	})}
	{template}
/>

<Story
	name="scatter anticipation fire"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			// Reel 3 top cell (grid order) — fire must overflow the cabinet, not clip.
			stateGame.anticipationIndex = 8;
		},
	})}
	{template}
/>

<Story
	name="fire frames overlay"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.fireFrames = [
				{ reel: 0, row: 2 },
				{ reel: 1, row: 3 },
				{ reel: 2, row: 1 },
				{ reel: 3, row: 2 },
			];
		},
	})}
	{template}
/>

<Story
	name="freegame 3s background"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.freeSpinBackground = '3s';
		},
	})}
	{template}
/>

<Story
	name="freegame 4s background"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.freeSpinBackground = '4s';
		},
	})}
	{template}
/>

<Story
	name="freegame 5s background"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.freeSpinBackground = '5s';
		},
	})}
	{template}
/>
