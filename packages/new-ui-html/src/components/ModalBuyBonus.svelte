<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { getContextLayout } from 'utils-layout';
	import { stateModal, stateMetaDerived } from 'state-shared';

	import BonusCards from './BonusCards.svelte';
	import BonusControlBar from './BonusControlBar.svelte';
	import BonusContentWrapLarge from './BonusContentWrapLarge.svelte';
	import BonusContentWrapPortrait from './BonusContentWrapPortrait.svelte';
	import BonusContentWrapLandscape from './BonusContentWrapLandscape.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import { closeIconSrc } from '../closeIcon';

	const { stateLayoutDerived } = getContextLayout();

	const mysteryLast = <T extends { mode: string }>(list: T[]) => {
		const mystery = list.filter((item) => item.mode === 'bonus_mystery');
		const rest = list.filter((item) => item.mode !== 'bonus_mystery');
		return [...rest, ...mystery];
	};

	// Activate first, then buys — Mystery Bonus always last on every viewport.
	const activateList = $derived(
		mysteryLast(stateMetaDerived.betModeMetaList().filter((item) => item.type === 'activate')),
	);

	const buyList = $derived(
		mysteryLast(stateMetaDerived.betModeMetaList().filter((item) => item.type === 'buy')),
	);

	const COMPONENT_MAP = {
		desktop: BonusContentWrapLarge,
		tablet: BonusContentWrapLarge,
		portrait: BonusContentWrapPortrait,
		landscape: BonusContentWrapLandscape,
	} as const;

	const BonusContentWrap = $derived(COMPONENT_MAP[stateLayoutDerived.layoutType()]);

	const closeBonusScreen = () => {
		if (stateBonus.detailOpen) {
			stateBonus.detailOpen = false;
			return;
		}
		stateModal.modal = null;
	};
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<!-- Only the top-right X closes this screen; backdrop clicks are ignored. -->
	<Popup
		zIndex={zIndex.modal}
		closeOnBackdrop={false}
		closeOnEscape={false}
		closeIconSrc={closeIconSrc}
		onclose={closeBonusScreen}
	>
		<BonusContentWrap
			maxListLength={Math.max(activateList.length, buyList.length)}
			cardCount={activateList.length + buyList.length}
		>
			{#snippet betAmount()}
				<BonusControlBar />
			{/snippet}

			{#snippet bonusCardsActivate()}
				<BonusCards list={activateList} />
			{/snippet}

			{#snippet bonusCardsBuy()}
				<BonusCards list={buyList} />
			{/snippet}
		</BonusContentWrap>
	</Popup>
{/if}
