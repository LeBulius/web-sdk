<script lang="ts">
	import { Zap } from 'lucide-svelte';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal, stateUi, INFINITY_MARK } from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { socializeText } from 'utils-shared/social';

	import { stateBonus, stateBonusDerived } from '../stateBonus.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';
	import { closeIconSrc } from '../closeIcon';
	import { getBonusPagePreset, resolveBonusPageSize } from '../bonusPageSettings';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const size = $derived(
		resolveBonusPageSize(innerWidth.current ?? 1200, innerHeight.current ?? 675),
	);
	const preset = $derived(
		getBonusPagePreset(innerWidth.current ?? 1200, innerHeight.current ?? 675),
	);

	const data = $derived(stateBonusDerived.selectedBetModeData());
	const price = $derived(stateBet.betAmount * (data?.costMultiplier ?? 0));
	const canAfford = $derived(stateBet.betAmount > 0 && stateBet.balanceAmount >= price);
	const isActivate = $derived(data?.type === 'activate');

	const filledZaps = $derived.by(() => {
		const match = data?.assets.volatility?.match(/(\d+)/);
		const n = match ? Number(match[1]) : 0;
		return Math.min(5, Math.max(1, n || (data?.type === 'activate' ? 3 : 5)));
	});

	const description = $derived(
		socializeText(data?.text.description?.trim() || data?.text.dialog?.trim() || ''),
	);

	const closeDetail = () => {
		stateBonus.detailOpen = false;
	};

	const confirm = () => {
		if (!data || !canAfford) return;

		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;

		if (data.type === 'buy') {
			eventEmitter.broadcast({ type: 'bet' });
		}

		if (data.type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}

		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBonus.detailOpen = false;
		stateModal.modal = null;
	};

	const cssVars = $derived(
		[
			`--bonus-confirm-root-pad: ${preset.confirm.rootPad}`,
			`--bonus-confirm-w: ${preset.confirm.width}`,
			`--bonus-confirm-max-h: ${preset.confirm.maxHeight}`,
			`--bonus-confirm-radius: ${preset.confirm.radius}`,
			`--bonus-confirm-preview-min-h: ${preset.confirm.previewMinH}`,
			`--bonus-confirm-preview-img-max-h: ${preset.confirm.previewImgMaxH}`,
			`--bonus-confirm-body-pad: ${preset.confirm.bodyPad}`,
			`--bonus-confirm-body-gap: ${preset.confirm.bodyGap}`,
			`--bonus-confirm-title-size: ${preset.confirm.titleSize}`,
			`--bonus-confirm-desc-size: ${preset.confirm.descSize}`,
			`--bonus-confirm-price-size: ${preset.confirm.priceSize}`,
			`--bonus-confirm-action-pad: ${preset.confirm.actionPad}`,
			`--bonus-confirm-action-size: ${preset.confirm.actionSize}`,
			`--bonus-confirm-close-size: ${preset.confirm.closeSize}`,
		].join('; '),
	);
</script>

{#if stateModal.modal?.name === 'buyBonus' && stateBonus.detailOpen && data}
	<div class="detail-root" data-bonus-size={size} style="z-index: {zIndex.dialog}; {cssVars}">
		<!-- Outside the card → back to main bonus screen -->
		<button
			type="button"
			class="detail-backdrop"
			aria-label="Back to bonus selection"
			onclick={closeDetail}
		></button>

		<!-- Top-right X returns to the bonus page (does not close the feature UI) -->
		<button
			type="button"
			class="close-button"
			data-test="close-button"
			aria-label="Back to bonus selection"
			onclick={closeDetail}
		>
			<img src={closeIconSrc} alt="" class="close-icon" />
		</button>

		<!-- Clicks on the card (except Confirm) do nothing -->
		<div class="detail-card">
			<div class="preview">
				{#if data.assets.dialogImage}
					<img class="preview-img" src={data.assets.dialogImage} alt="" />
				{:else if data.assets.icon}
					<img class="preview-img" src={data.assets.icon} alt="" />
				{/if}
			</div>

			<div class="body">
				<div class="volatility">
					{#each Array(5) as _, i}
						<Zap
							size={preset.confirm.zapSize}
							color={i < filledZaps ? '#22d3ee' : '#9ca3af'}
							fill={i < filledZaps ? '#22d3ee' : '#9ca3af'}
							strokeWidth={0}
						/>
					{/each}
				</div>

				<h2 class="title">{socializeText(data.text.title)}</h2>

				{#if description}
					<p class="description">{description}</p>
				{/if}

				<p class="price">{numberToCurrencyString(price)}</p>

				<button
					type="button"
					class="confirm"
					class:activate={isActivate}
					class:buy={!isActivate}
					data-test="confirm-button"
					disabled={!canAfford}
					onclick={confirm}
				>
					{i18nDerived.confirm()}
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.detail-root {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--bonus-confirm-root-pad, 1.5rem 1.5rem 6.5rem);
		box-sizing: border-box;
		pointer-events: none;
	}

	.detail-backdrop {
		position: absolute;
		inset: 0;
		border: none;
		padding: 0;
		margin: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		cursor: pointer;
		pointer-events: auto;
	}

	.close-button {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		z-index: 2;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.65rem;
		background-color: transparent;
		border: none;
		line-height: 0;
		width: var(--bonus-confirm-close-size, 3.25rem);
		height: var(--bonus-confirm-close-size, 3.25rem);
		pointer-events: auto;
	}

	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		pointer-events: none;
		mix-blend-mode: screen;
	}

	.detail-card {
		position: relative;
		z-index: 1;
		width: var(--bonus-confirm-w, min(20rem, 92vw));
		max-height: var(--bonus-confirm-max-h, none);
		border-radius: var(--bonus-confirm-radius, 1.25rem);
		overflow: hidden;
		background: #fff;
		border: 0px solid rgba(34, 211, 238, 0.55);
		box-shadow: 0 24px 56px rgba(0, 0, 0, 0.55);
		pointer-events: auto;
		font-family: 'Kontora Black', sans-serif;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.preview {
		min-height: var(--bonus-confirm-preview-min-h, 11rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: linear-gradient(180deg, #3f4654 0%, #1f2430 100%);
	}

	.preview-img {
		max-width: 100%;
		max-height: var(--bonus-confirm-preview-img-max-h, 9.5rem);
		object-fit: contain;
		display: block;
	}

	.body {
		padding: var(--bonus-confirm-body-pad, 1rem 1.25rem 1.35rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--bonus-confirm-body-gap, 0.55rem);
		text-align: center;
	}

	.volatility {
		display: flex;
		justify-content: center;
		gap: 0.2rem;
	}

	.title {
		margin: 0;
		font-size: var(--bonus-confirm-title-size, 1rem);
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #1f2937;
		text-transform: uppercase;
	}

	.description {
		margin: 0;
		font-size: var(--bonus-confirm-desc-size, 0.85rem);
		line-height: 1.35;
		color: #4b5563;
		max-width: 16rem;
	}

	.price {
		margin: 0.25rem 0 0;
		font-size: var(--bonus-confirm-price-size, 2rem);
		font-weight: 800;
		line-height: 1.1;
		color: #111827;
		white-space: nowrap;
	}

	.confirm {
		width: 100%;
		margin-top: 0.35rem;
		border: 0px solid #0a0a0a;
		border-radius: 0.85rem;
		padding: var(--bonus-confirm-action-pad, 0.85rem 1rem);
		font-size: var(--bonus-confirm-action-size, 0.95rem);
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: filter 120ms ease, opacity 120ms ease;
	}

	.confirm.buy {
		color: #0f172a;
		background: #22d3ee;
	}

	.confirm.activate {
		color: #111827;
		background: #facc15;
	}

	.confirm:hover:not(:disabled) {
		filter: brightness(1.05);
	}

	.confirm:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.detail-root[data-bonus-size='popoutS'] .description {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: 100%;
	}

	.detail-root[data-bonus-size='popoutS'] .preview {
		padding: 0.25rem;
	}

	.detail-root[data-bonus-size='popoutS'] .confirm {
		border-radius: 0.4rem;
		margin-top: 0.12rem;
	}

	.detail-root[data-bonus-size='popoutS'] .price {
		margin: 0.08rem 0 0;
	}

	.detail-root[data-bonus-size='popoutS'] .close-button {
		top: 0.1rem;
		right: 0.1rem;
		padding: 0.25rem;
	}
</style>
