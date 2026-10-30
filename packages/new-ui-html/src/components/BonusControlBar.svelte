<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { stateBet, stateConfig } from 'state-shared';
	import { OptionsToggle } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';
	import {
		numberToBalanceWinCurrencyString,
		numberToCurrencyString,
	} from 'utils-shared/amount';

	import { getBonusPagePreset } from '../bonusPageSettings';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const bar = $derived(
		getBonusPagePreset(innerWidth.current ?? 1200, innerHeight.current ?? 675).bar,
	);

	const betOptions = $derived(
		stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions,
	);

	const betProgress = $derived.by(() => {
		const options = betOptions;
		if (options.length <= 1) return options.length === 1 ? 1 : 0;
		const index = options.findIndex((amount) => amount === stateBet.betAmount);
		const safeIndex = index < 0 ? 0 : index;
		return safeIndex / (options.length - 1);
	});
</script>

<OptionsToggle
	value={stateBet.betAmount}
	options={betOptions}
	onchange={(value) => {
		stateBet.betAmount = value;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	}}
>
	{#snippet children({ disabledDown, disabledUp, toggleDown, toggleUp })}
		<div
			class="bar"
			style="--bar-opacity: {bar.opacity}; --pad-y: {bar.padY}; --pad-x: {bar.padX}; --label-gap: {bar.labelGap}"
		>
			<div
				class="section balance-section"
				style="
					padding: {bar.balance.padTop} {bar.balance.padRight} {bar.balance.padBottom} {bar.balance.padLeft};
					transform: translate({bar.balance.offsetX}, {bar.balance.offsetY});
				"
			>
				<span class="label">BALANCE</span>
				<span class="value"
					>{numberToBalanceWinCurrencyString(stateBet.balanceAmount)}</span
				>
			</div>

			<div class="section bet-section">
				<div class="bet-row">
					<button
						class="chevron"
						type="button"
						aria-label="Decrease bet"
						disabled={disabledDown}
						onclick={toggleDown}
					>
						<ChevronDown size={bar.chevronSize} strokeWidth={3.5} />
					</button>
					<div class="bet-text">
						<span class="label">{i18nDerived.bet()}</span>
						<span class="value">{numberToCurrencyString(stateBet.betAmount)}</span>
						<div
							class="bet-meter"
							aria-hidden="true"
							style="--bet-progress: {betProgress * 100}%"
						>
							<div class="bet-meter-fill"></div>
						</div>
					</div>
					<button
						class="chevron"
						type="button"
						aria-label="Increase bet"
						disabled={disabledUp}
						onclick={toggleUp}
					>
						<ChevronUp size={bar.chevronSize} strokeWidth={3.5} />
					</button>
				</div>
			</div>
		</div>
	{/snippet}
</OptionsToggle>

<style lang="scss">
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2.5rem;
		min-width: min(22rem, 92vw);
		padding: var(--pad-y) var(--pad-x);
		border-radius: 0.9rem;
		background: rgba(10, 10, 10, var(--bar-opacity));
		border: none;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
		color: #fff;
		font-family: 'Kontora Black', sans-serif;
	}

	.section {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.bet-section {
		align-items: stretch;
	}

	.bet-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.bet-text {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 4.5rem;
	}

	.label {
		font-family: 'Kontora Black', sans-serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #22d3ee;
		line-height: 1;
		margin-bottom: var(--label-gap);
		text-transform: uppercase;
	}

	.value {
		font-family: 'Kontora Black', sans-serif;
		font-size: 1.35rem;
		font-weight: 800;
		line-height: 1.1;
		white-space: nowrap;
		max-width: 9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #ffffff;
	}

	.chevron {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		padding: 0;
		border: none;
		background: transparent;
		color: #fff;
		cursor: pointer;
		line-height: 0;
		flex-shrink: 0;
	}

	.chevron:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.chevron:hover:not(:disabled) {
		opacity: 0.8;
	}

	.bet-meter {
		margin-top: 0.4rem;
		width: 100%;
		height: 0.16rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.bet-meter-fill {
		height: 100%;
		width: var(--bet-progress);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.95);
		transition: width 140ms ease;
	}

	@media (max-height: 280px) {
		.bar {
			gap: 0.75rem;
			min-width: min(16rem, 94vw);
			border-radius: 0.45rem;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		}

		.bet-row {
			gap: 0.25rem;
		}

		.bet-text {
			min-width: 2.75rem;
		}

		.label {
			font-size: 0.45rem;
		}

		.value {
			font-size: 0.75rem;
			max-width: 5.5rem;
		}

		.chevron {
			min-width: 1.25rem;
			min-height: 1.25rem;
		}

		.bet-meter {
			margin-top: 0.12rem;
			height: 0.08rem;
		}
	}
</style>
