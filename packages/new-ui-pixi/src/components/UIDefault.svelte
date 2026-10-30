<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getContextLayout } from 'utils-layout';
	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from './UiFadeContainer.svelte';
	import UiSlot from './UiSlot.svelte';
	import LayoutDesktop from './LayoutDesktop.svelte';
	import LayoutPortrait from './LayoutPortrait.svelte';
	import LayoutLandscape from './LayoutLandscape.svelte';
	import LayoutTablet from './LayoutTablet.svelte';
	import LabelBalance from './LabelBalance.svelte';
	import LabelWin from './LabelWin.svelte';
	import LabelBet from './LabelBet.svelte';
	import ButtonPayTable from './ButtonPayTable.svelte';
	import ButtonGameRules from './ButtonGameRules.svelte';
	import ButtonSettings from './ButtonSettings.svelte';
	import ButtonBuyBonus from './ButtonBuyBonus.svelte';
	import ButtonBet from './ButtonBet.svelte';
	import ButtonTurbo from './ButtonTurbo.svelte';
	import ButtonAutoSpin from './ButtonAutoSpin.svelte';
	import ButtonIncrease from './ButtonIncrease.svelte';
	import ButtonDecrease from './ButtonDecrease.svelte';
	import ButtonMenu from './ButtonMenu.svelte';
	import ButtonMenuClose from './ButtonMenuClose.svelte';
	import ButtonSoundSwitch from './ButtonSoundSwitch.svelte';

	type Props = {
		gameName: Snippet;
		logo: Snippet;
	};

	const props: Props = $props();

	const { stateLayoutDerived } = getContextLayout();

	const LAYOUT_COMPONENT_MAP = {
		desktop: LayoutDesktop,
		portrait: LayoutPortrait,
		landscape: LayoutLandscape,
		tablet: LayoutTablet,
	};

	const LayoutComponent = $derived(LAYOUT_COMPONENT_MAP[stateLayoutDerived.layoutType()]);
</script>

<EnableSpaceHold />

<UiFadeContainer>
	<LayoutComponent>
		{#snippet gameName()}
			{@render props.gameName()}
		{/snippet}

		{#snippet logo()}
			{@render props.logo()}
		{/snippet}

		{#snippet amountBalance(labelProps)}
			<UiSlot id="controlBar.balance"><LabelBalance {...labelProps} /></UiSlot>
		{/snippet}

		{#snippet amountWin(labelProps)}
			<UiSlot id="controlBar.win"><LabelWin {...labelProps} /></UiSlot>
		{/snippet}

		{#snippet amountBet(labelProps)}
			<UiSlot id="controlBar.bet"><LabelBet {...labelProps} /></UiSlot>
		{/snippet}

		{#snippet buttonBuyBonus(buttonProps)}
			<ButtonBuyBonus {...buttonProps} />
		{/snippet}

		{#snippet buttonBet(buttonProps)}
			<UiSlot id="controlBar.spin"><ButtonBet {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonTurbo(buttonProps)}
			<UiSlot id="controlBar.turbo"><ButtonTurbo {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonAutoSpin(buttonProps)}
			<UiSlot id="controlBar.autospin"><ButtonAutoSpin {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonIncrease(buttonProps)}
			<UiSlot id="controlBar.betPlus"><ButtonIncrease {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonDecrease(buttonProps)}
			<UiSlot id="controlBar.betMinus"><ButtonDecrease {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonMenu(buttonProps)}
			<UiSlot id="controlBar.menu"><ButtonMenu {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonMenuClose(buttonProps)}
			<UiSlot id="controlBar.menu"><ButtonMenuClose {...buttonProps} /></UiSlot>
		{/snippet}

		{#snippet buttonPayTable(buttonProps)}
			<ButtonPayTable {...buttonProps} />
		{/snippet}

		{#snippet buttonGameRules(buttonProps)}
			<ButtonGameRules {...buttonProps} />
		{/snippet}

		{#snippet buttonSettings(buttonProps)}
			<ButtonSettings {...buttonProps} />
		{/snippet}

		{#snippet buttonSoundSwitch(buttonProps)}
			<UiSlot id="audio.mute"><ButtonSoundSwitch {...buttonProps} /></UiSlot>
		{/snippet}
	</LayoutComponent>
</UiFadeContainer>
