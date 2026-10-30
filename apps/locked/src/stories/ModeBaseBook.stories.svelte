<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BASE/book',
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
	import { stateBet } from 'state-shared';
	import { playBet } from '../game/utils';
	import books from './data/base_books.json';
	import contrabandTypeSwapBook from './data/contraband_type_swap_book.json';
	import ReplayStorySetup from './ReplayStorySetup.svelte';
	import {
		isExpandingWildBook,
		isFireFramesBook,
		isFreegameBook,
		isTumbleBook,
		isTumbleInWildBook,
		isWincapBook,
		pickBook,
		pickContrabandBook,
		pickContrabandSymbolBook,
		withTumbledExpandingWild,
	} from './pickStoryBook';

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
	name="random"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books);
			console.log('Running a book at index', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="wincap"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, isWincapBook);
			console.log('Running wincap book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="freegame_3"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, (book) => isFreegameBook(book, 'freegame_3'));
			console.log('Running freegame_3 book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="freegame_4"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, (book) => isFreegameBook(book, 'freegame_4'));
			console.log('Running freegame_4 book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="freegame_5"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, (book) => isFreegameBook(book, 'freegame_5'));
			console.log('Running freegame_5 book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="expanding wild"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, isExpandingWildBook);
			console.log('Running expanding wild book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="fire frames"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, isFireFramesBook);
			console.log('Running fire frames book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="contraband"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickContrabandBook(books);
			console.log('Running contraband book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="contraband C lands"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickContrabandSymbolBook([contrabandTypeSwapBook, ...books]);
			console.log('Running contraband C book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="contraband C to H2 (530)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = books.find((book) => book.id === 530);
			if (!data) throw new Error('base book 530 missing from base_books.json');
			console.log('Running contraband C book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="tumble"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = pickBook(books, isTumbleBook);
			console.log('Running tumble book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="EW tumble in"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateBet.activeBetModeKey = 'base';
			const data = withTumbledExpandingWild(pickBook(books, isTumbleInWildBook));
			console.log('Running EW tumble-in book', data.id, data.criteria, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

{#snippet replayTemplate(args: TemplateArgs<any>)}
	<ReplayStorySetup mode="base" costMultiplier={1} {books} />
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
	name="replay"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {},
	})}
	template={replayTemplate}
/>
