<script lang="ts">
	import type { Snippet } from 'svelte';

	import ErrorModal from './ErrorModal.svelte';
	import AutoplayModal from './AutoplayModal.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import FeaturesModal from './FeaturesModal.svelte';
	import ModalGameRules from './ModalGameRules.svelte';
	import ModalPayTable from './ModalPayTable.svelte';
	import ModalBetMenu from './ModalBetMenu.svelte';
	import ModalBuyBonus from './ModalBuyBonus.svelte';
	import ModalBuyBonusConfirm from './ModalBuyBonusConfirm.svelte';
	import GameVersion from './GameVersion.svelte';

	type Props = {
		version?: Snippet;
		showError?: boolean;
		errorType?: 'insufficient-balance' | 'reload';
		showAutoplay?: boolean;
		selectedAutoplay?: number | null;
		showBetMenu?: boolean;
		currentBet?: number;
		betAmounts?: number[];
		showSettings?: boolean;
		showFeatures?: boolean;
		bet?: number;
		balance?: number;
		onCloseError?: () => void;
		onSelectAutoplay?: (rounds: number | null) => void;
		onCloseAutoplay?: () => void;
		onSelectBet?: (bet: number) => void;
		onCloseBetMenu?: () => void;
		onCloseSettings?: () => void;
		onOpenInfo?: () => void;
		onCloseFeatures?: () => void;
		onBetIncrease?: () => void;
		onBetDecrease?: () => void;
		onFeatureConfirmed?: (id: number) => void;
	};

	const {
		version,
		showError = false,
		errorType = 'insufficient-balance',
		showAutoplay = false,
		selectedAutoplay = null,
		showSettings = false,
		showFeatures = false,
		bet = 1,
		balance = 0,
		onCloseError,
		onSelectAutoplay,
		onCloseAutoplay,
		onCloseSettings,
		onOpenInfo,
		onCloseFeatures,
		onBetIncrease,
		onBetDecrease,
		onFeatureConfirmed,
	}: Props = $props();
</script>

<!--
	Modals aggregator — renders every modal in the new-ui-html system.
	Buy bonus opens via stateModal.modal = { name: 'buyBonus' } (from ButtonBuyBonus).
-->
<ErrorModal isOpen={showError} {errorType} onClose={onCloseError} />
<AutoplayModal
	isOpen={showAutoplay}
	selected={selectedAutoplay}
	onSelect={onSelectAutoplay ?? (() => {})}
	onClose={onCloseAutoplay ?? (() => {})}
/>
<SettingsModal
	isOpen={showSettings}
	onClose={onCloseSettings ?? (() => {})}
	onOpenInfo={onOpenInfo ?? (() => {})}
/>
<FeaturesModal
	isOpen={showFeatures}
	{bet}
	{balance}
	onClose={onCloseFeatures ?? (() => {})}
	onBetIncrease={onBetIncrease ?? (() => {})}
	onBetDecrease={onBetDecrease ?? (() => {})}
	onFeatureConfirmed={onFeatureConfirmed ?? (() => {})}
/>

<ModalGameRules>
	{#if version}
		{@render version()}
	{:else}
		<GameVersion version="" />
	{/if}
</ModalGameRules>
<ModalPayTable>
	{#if version}
		{@render version()}
	{:else}
		<GameVersion version="" />
	{/if}
</ModalPayTable>
<ModalBetMenu />
<ModalBuyBonus />
<ModalBuyBonusConfirm />
