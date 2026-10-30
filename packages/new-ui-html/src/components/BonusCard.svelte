<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		image: Snippet;
		volatility: Snippet;
		title: Snippet;
		price: Snippet;
		button: Snippet;
		/** activate → yellow CTA, buy → cyan CTA */
		variant?: 'activate' | 'buy';
		disabled?: boolean;
		onclick?: () => void;
	};

	const props: Props = $props();

	const onCardClick = () => {
		if (props.disabled) return;
		props.onclick?.();
	};
</script>

<button
	type="button"
	class="bonus-card"
	class:activate={props.variant === 'activate'}
	class:buy={props.variant !== 'activate'}
	disabled={props.disabled}
	onclick={onCardClick}
>
	<div class="preview">
		{@render props.image()}
	</div>
	<div class="body">
		<div class="volatility">
			{@render props.volatility()}
		</div>
		{@render props.title()}
		{@render props.price()}
		<!-- Decorative CTA — whole card opens the detail view -->
		<div class="action" aria-hidden="true">
			{@render props.button()}
		</div>
	</div>
</button>

<style lang="scss">
	/*
	 * Card size knobs (height is content-driven — no fixed height):
	 *   width          → overall card width
	 *   .preview min-height / .preview-img max-height → top art block
	 *   .body padding/gap, .price font-size, .action-label padding → body height
	 * Or set min-height here for a hard floor.
	 */
	.bonus-card {
		/* Sized per viewport via --bonus-card-* from BonusContentWrapLarge */
		width: var(--bonus-card-w, 12rem);
		min-height: var(--bonus-card-min-h, 16rem);
		overflow: hidden;
		border-radius: var(--bonus-card-radius, 1rem);
		background: #fff;
		border: 0px solid rgba(34, 211, 238, 0.55);
		box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-direction: column;
		padding: 0;
		text-align: inherit;
		font-family: 'Kontora Black', sans-serif;
		color: inherit;
		cursor: pointer;
		transform-origin: center center;
		transform: scale(1);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease,
			opacity 160ms ease;
		will-change: transform;
		box-sizing: border-box;
	}

	.bonus-card:disabled {
		cursor: not-allowed;
		opacity: 0.75;
		filter: grayscale(0.25);
		pointer-events: none;
	}

	.bonus-card:disabled :global(.action-label) {
		opacity: 0.65;
	}

	.bonus-card:hover:not(:disabled) {
		transform: scale(1.05);
		border-color: rgba(34, 211, 238, 0.95);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
	}

	.preview {
		min-height: var(--bonus-card-preview-min-h, 6rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.6rem;
		background: linear-gradient(180deg, #3f4654 0%, #1f2430 100%);
		pointer-events: none;
		box-sizing: border-box;
	}

	.body {
		padding: var(--bonus-card-body-pad, 0.7rem 0.8rem 0.9rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--bonus-card-body-gap, 0.45rem);
		text-align: center;
		pointer-events: none;
		box-sizing: border-box;
	}

	.volatility {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.15rem;
		min-height: 1rem;
	}

	.action {
		width: 100%;
	}

	.bonus-card :global(.title) {
		margin: 0;
		font-size: var(--bonus-card-title-size, 0.8rem);
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #374151;
		text-transform: uppercase;
	}

	.bonus-card :global(.price) {
		margin: 0;
		font-size: var(--bonus-card-price-size, 1.75rem);
		line-height: 1.1;
		font-weight: 800;
		color: #1f2937;
		white-space: nowrap;
	}

	.bonus-card :global(.action-label) {
		width: 100%;
		border: 0px solid #0a0a0a;
		border-radius: 10px;
		padding: var(--bonus-card-action-pad, 0.7rem 1rem);
		font-size: var(--bonus-card-action-size, 0.85rem);
		font-weight: 800;
		letter-spacing: 0.06em;
		color: #fff;
		display: block;
		box-sizing: border-box;
	}

	.bonus-card.activate :global(.action-label) {
		background: #facc15;
		border-color: #0a0a0a;
		color: #111827;
	}

	.bonus-card.buy :global(.action-label) {
		background: #22d3ee;
		border-color: #0a0a0a;
		color: #0f172a;
	}

	.bonus-card :global(.preview-img) {
		max-width: 100%;
		max-height: var(--bonus-card-preview-img-max-h, 5rem);
		object-fit: contain;
		display: block;
	}
</style>
