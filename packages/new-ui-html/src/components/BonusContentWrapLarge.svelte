<script lang="ts">
	import type { Snippet } from 'svelte';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';

	import {
		getBonusPagePreset,
		resolveBonusPageSize,
		type BonusPagePreset,
	} from '../bonusPageSettings';

	type Props = {
		betAmount: Snippet;
		bonusCardsActivate: Snippet;
		bonusCardsBuy: Snippet;
		maxListLength?: number;
		cardCount?: number;
	};

	const props: Props = $props();

	const size = $derived(
		resolveBonusPageSize(innerWidth.current ?? 1200, innerHeight.current ?? 675),
	);
	const preset = $derived(
		getBonusPagePreset(innerWidth.current ?? 1200, innerHeight.current ?? 675),
	);
	const isCarousel = $derived(preset.layout === 'carousel');

	let rowEl: HTMLDivElement | null = $state(null);
	/** Fitted card size (px) — 12:16 ratio, fills the carousel row. */
	let fitH = $state(0);
	let fitW = $state(0);

	const cssVars = (p: BonusPagePreset) =>
		[
			`--bonus-cards-gap: ${p.cardsGap}`,
			`--bonus-cards-pad-top: ${p.cardsPadTop}`,
			`--bonus-cards-pad-x: ${p.cardsPadX}`,
			`--bonus-cards-pad-bottom: ${p.cardsPadBottom}`,
			`--bonus-bar-pad: ${p.barPad}`,
			`--bonus-card-w: ${p.cardWidth}`,
			`--bonus-card-min-h: ${p.cardMinHeight}`,
			`--bonus-card-preview-min-h: ${p.cardPreviewMinHeight}`,
			`--bonus-card-preview-img-max-h: ${p.cardPreviewImgMaxHeight}`,
			`--bonus-card-body-pad: ${p.cardBodyPad}`,
			`--bonus-card-body-gap: ${p.cardBodyGap}`,
			`--bonus-card-title-size: ${p.cardTitleSize}`,
			`--bonus-card-price-size: ${p.cardPriceSize}`,
			`--bonus-card-action-pad: ${p.cardActionPad}`,
			`--bonus-card-action-size: ${p.cardActionSize}`,
			`--bonus-card-radius: ${p.cardRadius}`,
			`--bonus-card-fit-h: ${fitH}px`,
			`--bonus-card-fit-w: ${fitW}px`,
		].join('; ');

	$effect(() => {
		if (!isCarousel || !rowEl) return;
		const updateFit = () => {
			const cardsEl = rowEl?.querySelector('.cards') as HTMLElement | null;
			const box = cardsEl ?? rowEl;
			if (!box) return;
			const n = Math.max(1, cardsEl?.querySelectorAll('.bonus-card').length || 5);
			const gap = cardsEl ? parseFloat(getComputedStyle(cardsEl).columnGap || '0') || 0 : 0;
			const boxW = box.clientWidth;
			const boxH = box.clientHeight;
			const maxW = (boxW - gap * (n - 1)) / n;
			const maxHFromW = (maxW * 16) / 12;
			const nextH = Math.max(0, Math.floor(Math.min(boxH, maxHFromW)));
			fitH = nextH;
			fitW = Math.floor((nextH * 12) / 16);
		};
		updateFit();
		const ro = new ResizeObserver(updateFit);
		ro.observe(rowEl);
		return () => ro.disconnect();
	});
</script>

<div
	class="features-layout"
	class:align-center={preset.cardsAlign === 'center'}
	class:align-start={preset.cardsAlign === 'start'}
	class:carousel={isCarousel}
	data-bonus-size={size}
	style={cssVars(preset)}
>
	<div class="cards-row" bind:this={rowEl}>
		<div class="cards">
			{@render props.bonusCardsActivate()}
			{@render props.bonusCardsBuy()}
		</div>
	</div>

	<div class="bar-wrap">
		{@render props.betAmount()}
	</div>
</div>

<style lang="scss">
	.features-layout {
		position: relative;
		width: min(100vw, 1100px);
		height: 100%;
		max-height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 0;
		box-sizing: border-box;
		overflow: hidden;
	}

	.cards-row {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		align-items: stretch;
		position: relative;
	}

	.cards {
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: stretch;
		gap: var(--bonus-cards-gap, 1rem);
		padding: var(--bonus-cards-pad-top, 3.5rem) var(--bonus-cards-pad-x, 1rem)
			var(--bonus-cards-pad-bottom, 0.75rem);
		box-sizing: border-box;
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
		touch-action: pan-y;
	}

	.features-layout.align-center .cards {
		align-content: safe center;
	}

	.features-layout.align-start .cards {
		align-content: flex-start;
	}

	/* Popout S: equal 12:16 cards, as large as the row allows, no arrows */
	.features-layout.carousel {
		padding-top: 0.9rem;
	}

	.features-layout.carousel .bar-wrap {
		padding: 0.1rem 0.3rem 0.15rem;
	}

	.features-layout.carousel .cards-row {
		padding: 0 0.2rem;
	}

	.features-layout.carousel .cards {
		flex-wrap: nowrap;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		touch-action: pan-x;
		padding: 0;
		gap: 0.3rem;
	}

	.features-layout.carousel .cards::-webkit-scrollbar {
		display: none;
	}

	.features-layout.carousel .cards {
		scrollbar-width: none;
	}

	.features-layout.carousel .cards > :global(*),
	.features-layout.carousel :global(.bonus-card) {
		flex: 0 0 var(--bonus-card-fit-w);
		width: var(--bonus-card-fit-w) !important;
		min-width: var(--bonus-card-fit-w) !important;
		max-width: var(--bonus-card-fit-w) !important;
		height: var(--bonus-card-fit-h) !important;
		min-height: 0 !important;
		box-sizing: border-box;
		overflow: hidden;
	}

	.features-layout.carousel :global(.bonus-card) {
		transform: none !important;
		margin: 0;
		border-radius: 0.45rem;
	}

	.features-layout.carousel :global(.preview) {
		min-height: 0 !important;
		flex: 1 1 36%;
		padding: 0.2rem !important;
		width: 100%;
		overflow: hidden;
	}

	.features-layout.carousel :global(.preview-img) {
		max-height: 2.1rem !important;
		max-width: 100%;
	}

	.features-layout.carousel :global(.body) {
		padding: 0.18rem 0.22rem 0.22rem !important;
		gap: 0.08rem !important;
		flex: 0 1 auto;
		min-height: 0;
		width: 100%;
		max-width: 100%;
		overflow: hidden;
		box-sizing: border-box;
	}

	.features-layout.carousel :global(.volatility) {
		min-height: 0;
		gap: 0.05rem;
	}

	.features-layout.carousel :global(.volatility svg) {
		width: 8px !important;
		height: 8px !important;
	}

	.features-layout.carousel :global(.title),
	.features-layout.carousel :global(.price) {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.features-layout.carousel :global(.title) {
		font-size: 0.42rem !important;
	}

	.features-layout.carousel :global(.price) {
		font-size: 0.62rem !important;
	}

	.features-layout.carousel :global(.action-label) {
		padding: 0.2rem 0.15rem !important;
		font-size: 0.4rem !important;
		border-radius: 5px !important;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cards::-webkit-scrollbar {
		width: 0.45rem;
	}

	.cards::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.35);
		border-radius: 999px;
	}

	.cards::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.25);
		border-radius: 999px;
	}

	.bar-wrap {
		flex: 0 0 auto;
		display: flex;
		justify-content: center;
		padding: var(--bonus-bar-pad, 0.5rem 1rem 1rem);
		box-sizing: border-box;
		pointer-events: auto;
	}
</style>
