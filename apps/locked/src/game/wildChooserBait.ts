import { stateBet } from 'state-shared';

import { stateGame } from './stateGame.svelte';
import { REEL_ROWS } from './constants';
import { normalizeBonusMode } from './bonusMeta';
import type { Position } from './types';

/** Visual-only W/VS chooser bait. Book still owns real VS upgrades. */
export const WILD_BAIT_CHANCE = 0.33;

let chanceOverride: number | null = null;

/** Storybook / tests: pass `1` to always bait, `null` to restore mode chance. */
export const setWildBaitChance = (chance: number | null) => {
	chanceOverride = chance;
};

const cellKey = (position: Position) => `${position.reel}:${position.row}`;

const baitChance = () => {
	if (chanceOverride != null) return chanceOverride;
	return normalizeBonusMode(stateBet.activeBetModeKey) === 'degen_spin' ? 1 : WILD_BAIT_CHANCE;
};

export const visibleSquareWildPositions = (): Position[] => {
	const positions: Position[] = [];
	stateGame.board.forEach((reel, reelIndex) => {
		const rows = REEL_ROWS[reelIndex] ?? 0;
		const symbols = reel.reelState.symbols;
		for (let visible = 0; visible < rows; visible += 1) {
			const symbol = symbols[visible + 1];
			if (symbol?.rawSymbol.name !== 'W') continue;
			positions.push({ reel: reelIndex, row: visible + 1 });
		}
	});
	return positions;
};

export const pickBaitPositions = (exclude: Position[] = []): Position[] => {
	const skip = new Set(exclude.map(cellKey));
	const chance = baitChance();
	return visibleSquareWildPositions().filter((position) => {
		if (skip.has(cellKey(position))) return false;
		return Math.random() < chance;
	});
};

export const mergeChooserWithBaits = (
	positions: Position[],
	results: ('W' | 'VS')[],
): { positions: Position[]; results: ('W' | 'VS')[] } => {
	const bait = pickBaitPositions(positions);
	if (!bait.length) return { positions, results };
	return {
		positions: [...positions, ...bait],
		results: [...results, ...bait.map(() => 'W' as const)],
	};
};
