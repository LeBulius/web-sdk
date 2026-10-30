<script lang="ts">
	import { onDestroy } from 'svelte';
	import { stateBet, stateModal, stateUi } from 'state-shared';

	type ReplayBook = {
		id?: string | number;
		payoutMultiplier?: number;
		events: unknown[];
	};

	type Props = {
		mode: string;
		costMultiplier: number;
		books: ReplayBook[];
		betAmount?: number;
		/** Pin a specific math book so this story always replays the same round. */
		bookId?: string | number;
	};

	const props: Props = $props();

	/** One unique published book per mode — START always plays this round. */
	const UNIQUE_ROUND_ID: Record<string, number> = {
		base: 1113,
		ante: 458,
		bonus: 49,
		bonus_super: 64,
		bonus_mystery: 54,
		degen_spin: 0,
	};

	const pickBook = (books: ReplayBook[]) => {
		const wanted = props.bookId ?? UNIQUE_ROUND_ID[props.mode];
		if (wanted != null) {
			const match = books.find((book) => String(book.id) === String(wanted));
			if (match) return match;
		}
		return books[0];
	};

	const seed = () => {
		const book = pickBook(props.books);
		const betAmount = props.betAmount ?? 400;
		const replayBet = {
			payoutMultiplier: book?.payoutMultiplier ?? 0,
			state: book?.events ?? [],
			event: '0',
			active: true,
			mode: props.mode,
		};

		stateUi.config.mode = 'replay';
		stateModal.modal = null;
		stateBet.currency = 'USD';
		stateBet.betAmount = betAmount;
		stateBet.wageredBetAmount = betAmount;
		stateBet.winBookEventAmount = 0;
		stateBet.activeBetModeKey = props.mode;
		stateBet.replayCostMultiplier = props.costMultiplier;
		stateBet.replayBet = JSON.parse(JSON.stringify(replayBet));
		stateBet.betToResume = JSON.parse(JSON.stringify(replayBet));
	};

	seed();

	onDestroy(() => {
		stateUi.config.mode = 'default';
		stateBet.replayBet = null;
		stateBet.betToResume = null;
		stateBet.replayCostMultiplier = 1;
		stateModal.modal = null;
	});
</script>
