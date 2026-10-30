<script lang="ts" module>
	export type ConnectionWin = {
		amount: number;
		reel: number;
		row: number;
	};

	export type EmitterEventConnectionWinAmounts = {
		type: 'showConnectionWinAmounts';
		wins: ConnectionWin[];
	};
</script>

<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToBalanceWinCurrencyString } from 'utils-shared/amount';

	import BoardContainer from './BoardContainer.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { gridCellCenter } from '../game/grid';
	import { getContext } from '../game/context';

	const HOLD_MS = 380;

	type ActiveWin = ConnectionWin & { oncomplete: () => void; show: boolean };

	const context = getContext();
	let wins: ActiveWin[] = $state([]);

	context.eventEmitter.subscribeOnMount({
		showConnectionWinAmounts: async (emitterEvent) => {
			wins = emitterEvent.wins.map((win) => ({
				...win,
				show: true,
				oncomplete: () => {},
			}));

			await Promise.all(
				wins.map(async (win) => {
					// Assign resolve before flipping show so FadeContainer's effect can't miss it.
					const fadedOut = waitForResolve((resolve) => {
						win.oncomplete = resolve;
					});
					await waitForTimeout(HOLD_MS);
					win.show = false;
					await Promise.race([fadedOut, waitForTimeout(400)]);
				}),
			);

			wins = [];
		},
	});
</script>

<BoardContainer>
	{#each wins as win, i (`${win.reel}-${win.row}-${i}`)}
		{@const center = gridCellCenter(win.reel, win.row - 1)}
		{@const x = center.x}
		{@const y = center.y}
		<FadeContainer
			show={win.show}
			zIndex={1000}
			oncomplete={() => {
				if (!win.show) win.oncomplete();
			}}
		>
			<Text
				anchor={0.5}
				{x}
				{y}
				zIndex={1000}
				text={bookEventAmountToBalanceWinCurrencyString(win.amount)}
				style={{
					fontFamily: 'Outfit SemiBold',
					fontSize: SYMBOL_SIZE * 0.34,
					fontWeight: '800',
					fill: 0xff2a2a,
					stroke: { color: 0x000000, width: 4 },
				}}
			/>
		</FadeContainer>
	{/each}
</BoardContainer>
