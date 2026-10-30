<script lang="ts">
	import { onDestroy } from 'svelte';
	import { stateBet, stateBetDerived, stateModal, stateUi, stateUrlDerived } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { gameActor } from '../game/actor';
	import { getContext } from '../game/context';
	import { gameT } from '../i18n/i18nDerived';

	const closeSrc = new URL('../assets/sprites/ui/close.webp', import.meta.url).href;

	const context = getContext();

	let phase = $state<'prompt' | 'playing' | 'done'>('prompt');
	let modalOpen = $state(true);
	let stopWatching: (() => void) | undefined;

	const isReplay = $derived(stateUi.config.mode === 'replay' || stateUrlDerived.replay());
	const loading = $derived(context.stateLayout.showLoadingScreen);
	const hasReplay = $derived(Boolean(stateBet.replayBet));
	const error = $derived(stateModal.modal?.name === 'error' ? stateModal.modal.error : null);

	const modeMeta = $derived(stateBetDerived.activeBetMode());
	const modeTitle = $derived(
		(modeMeta?.text.title || stateUrlDerived.mode()?.replaceAll('_', ' ') || 'BASE').toLowerCase(),
	);
	const costMultiplier = $derived(stateBet.replayCostMultiplier || 1);
	const payoutMultiplier = $derived(
		typeof stateBet.replayBet?.payoutMultiplier === 'number'
			? stateBet.replayBet.payoutMultiplier
			: 0,
	);
	const baseBetText = $derived(numberToCurrencyString(stateBet.betAmount));
	const spentText = $derived(numberToCurrencyString(stateBet.betAmount * costMultiplier));
	const winText = $derived(numberToCurrencyString(stateBet.betAmount * payoutMultiplier));

	const formatMultiplier = (value: number) => {
		const rounded = Number.isInteger(value) ? String(value) : String(Number.parseFloat(value.toFixed(2)));
		return `${rounded}x`;
	};

	const errorText = $derived.by(() => {
		if (!error) return gameT('REPLAY LOAD ERROR');
		if (typeof error === 'string') return error;
		if (typeof error === 'object' && error !== null) {
			const record = error as { message?: unknown };
			if (typeof record.message === 'string' && record.message.trim()) {
				return record.message;
			}
		}
		return gameT('REPLAY LOAD ERROR');
	});

	const canPlay = $derived(hasReplay && !error);
	const showModal = $derived(isReplay && !loading && modalOpen && phase !== 'playing');
	const showPill = $derived(isReplay && !loading && !modalOpen && phase !== 'playing' && canPlay);

	onDestroy(() => stopWatching?.());

	const cloneReplayBet = () => {
		if (!stateBet.replayBet) return null;
		return JSON.parse(JSON.stringify(stateBet.replayBet));
	};

	const startReplay = () => {
		if (!canPlay) return;
		const bet = cloneReplayBet();
		if (!bet) return;

		modalOpen = false;
		phase = 'playing';
		// `event` is the book-event resume index, not the RGS round id. Replay always starts at 0.
		stateBet.betToResume = { ...bet, event: '0', active: true };

		stopWatching?.();
		let seenBusy = false;
		const { unsubscribe } = gameActor.subscribe((snapshot) => {
			if (!snapshot.matches('idle')) {
				seenBusy = true;
				return;
			}
			if (!seenBusy) return;
			phase = 'done';
			modalOpen = false;
			unsubscribe();
			stopWatching = undefined;
		});
		stopWatching = unsubscribe;

		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		context.eventEmitter.broadcast({ type: 'resumeBet' });
		gameActor.send({ type: 'RESUME_BET' });
	};

	const openModal = () => {
		modalOpen = true;
	};

	const closeModal = () => {
		modalOpen = false;
		if (phase === 'prompt') phase = 'done';
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (!showModal || !canPlay) return;
		if (event.code !== 'Space' && event.key !== ' ') return;
		event.preventDefault();
		startReplay();
	};
</script>

<svelte:window onkeydown={onKeydown} />

{#if showModal}
	<div class="overlay" role="presentation">
		<div class="card" role="dialog" aria-modal="true" aria-labelledby="replay-overlay-title">
			<button class="close" type="button" aria-label="Close" onclick={closeModal}>
				<img src={closeSrc} alt="" />
			</button>
			<h2 id="replay-overlay-title" class="title">{gameT('GAME REPLAY')}</h2>

			{#if canPlay}
				<dl class="rows">
					<div>
						<dt>Mode</dt>
						<dd>{modeTitle}</dd>
					</div>
					<div>
						<dt>Base bet</dt>
						<dd>{baseBetText}</dd>
					</div>
					<div>
						<dt>Cost multiplier</dt>
						<dd>{formatMultiplier(costMultiplier)}</dd>
					</div>
					<div class="total-cost">
						<dt>Total bet cost</dt>
						<dd>{spentText}</dd>
					</div>
				</dl>
				<hr class="divider" />
				<dl class="rows">
					<div>
						<dt>Payout multiplier</dt>
						<dd>{formatMultiplier(payoutMultiplier)}</dd>
					</div>
				</dl>
				<div class="win-panel">
					<span class="win-label">Total win</span>
					<span class="win-amount">{winText}</span>
				</div>
				<button class="start" type="button" data-test="replay-play" onclick={startReplay}>
					Start
				</button>
			{:else}
				<p class="body">{errorText}</p>
			{/if}
		</div>
	</div>
{/if}

{#if showPill}
	<button class="pill" type="button" data-test="replay-open" onclick={openModal}>
		{gameT('GAME REPLAY')}
	</button>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.6);
		font-family: 'Outfit SemiBold', sans-serif;
	}

	.card {
		position: relative;
		width: min(22.5rem, 100%);
		display: flex;
		flex-direction: column;
		padding: 1.35rem 1.35rem 1.15rem;
		background: #0a0a0a;
		border-radius: 0.625rem;
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
	}

	.close {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		width: 2.1rem;
		height: 2.1rem;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.close img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.title {
		margin: 0 1.75rem 1.05rem;
		color: #ffffff;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-align: center;
		text-transform: uppercase;
	}

	.rows {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.rows div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	dt,
	dd {
		margin: 0;
		font-size: 0.82rem;
		letter-spacing: 0.04em;
	}

	dt {
		color: #22d3ee;
		font-weight: 700;
		text-transform: uppercase;
	}

	dd {
		color: #ffffff;
		font-weight: 700;
		text-align: right;
	}

	.total-cost dt,
	.total-cost dd {
		color: #ffffff;
		font-weight: 800;
	}

	.divider {
		width: 100%;
		margin: 0.85rem 0;
		border: none;
		border-top: 1px solid #141414;
	}

	.win-panel {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.55rem 0.75rem 0.65rem;
		background: #ffffff;
		border: 4px solid #000000;
		border-radius: 0.625rem;
	}

	.win-label {
		color: #22d3ee;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.win-amount {
		color: #111827;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		line-height: 1.1;
	}

	.body {
		margin: 0.25rem 0 0;
		color: #ffffff;
		font-size: 0.9rem;
		line-height: 1.45;
		text-align: center;
	}

	.start {
		margin-top: 1.05rem;
		width: 100%;
		padding: 0.85rem 1rem;
		border: none;
		border-radius: 0.625rem;
		background: #22d3ee;
		color: #0f172a;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.start:hover {
		filter: brightness(1.06);
	}

	.start:active {
		filter: brightness(0.95);
	}

	.pill {
		position: fixed;
		left: 50%;
		bottom: 6.5rem;
		z-index: 80;
		transform: translateX(-50%);
		padding: 0.55rem 1.15rem;
		border: none;
		border-radius: 999px;
		background: #0a0a0a;
		color: #ffffff;
		font-family: 'Outfit SemiBold', sans-serif;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
	}

	.pill:hover {
		filter: brightness(1.12);
	}
</style>
