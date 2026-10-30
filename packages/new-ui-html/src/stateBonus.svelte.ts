import { stateMeta } from 'state-shared';

export const stateBonus = $state({
	selectedBetModeKey: 'BASE',
	/** Detailed bonus card overlay open over the main buy-bonus screen */
	detailOpen: false,
});

export const stateBonusDerived = {
	selectedBetModeData: () => stateMeta.betModeMeta[stateBonus.selectedBetModeKey],
};
