import { REEL_ROWS } from './constants';
import { cellLandOrder } from './createReelForCellSpinning.svelte';
import { stateGame } from './stateGame.svelte';
import type { RawSymbol } from './types';

export const isScatterSymbol = (rawSymbol: RawSymbol) =>
	rawSymbol.name === 'S' || Boolean(rawSymbol.scatter);

const visibleCell = (reelIndex: number, row: number) => {
	const reel = stateGame.board[reelIndex];
	if (!reel) return undefined;
	return reel.reelState.symbols.find((symbol) => symbol.symbolIndexOfBoard === row);
};

export const isCellSpinning = (reelIndex: number, row: number) => {
	if (stateGame.coveredOverlayReels.includes(reelIndex)) return false;
	if (stateGame.hiddenOverlayCells.some((cell) => cell.reel === reelIndex && cell.row === row + 1)) {
		return false;
	}
	const cell = visibleCell(reelIndex, row);
	return cell?.symbolState === 'spin';
};

export const lockedScatterCount = () => {
	let count = 0;
	for (let reelIndex = 0; reelIndex < REEL_ROWS.length; reelIndex += 1) {
		const rows = REEL_ROWS[reelIndex] ?? 0;
		for (let row = 0; row < rows; row += 1) {
			const cell = visibleCell(reelIndex, row);
			if (!cell || cell.symbolState === 'spin') continue;
			if (isScatterSymbol(cell.rawSymbol)) count += 1;
		}
	}
	return count;
};

export const firstSpinningCellIndex = () => {
	for (let reelIndex = 0; reelIndex < REEL_ROWS.length; reelIndex += 1) {
		const rows = REEL_ROWS[reelIndex] ?? 0;
		for (let row = 0; row < rows; row += 1) {
			if (isCellSpinning(reelIndex, row)) return cellLandOrder(reelIndex, row);
		}
	}
	return null;
};

export const cellFromIndex = (index: number) => {
	for (let reelIndex = 0; reelIndex < REEL_ROWS.length; reelIndex += 1) {
		const rows = REEL_ROWS[reelIndex] ?? 0;
		for (let row = 0; row < rows; row += 1) {
			if (cellLandOrder(reelIndex, row) === index) return { reelIndex, row };
		}
	}
	return null;
};

export const clearScatterAnticipation = () => {
	stateGame.anticipationIndex = null;
};

/** Start or keep the one-cell walk when 2+ scatters are locked and cells still spin. */
export const syncScatterAnticipation = () => {
	if (lockedScatterCount() < 2) {
		if (stateGame.anticipationIndex !== null && firstSpinningCellIndex() === null) {
			stateGame.anticipationIndex = null;
		}
		return;
	}
	if (stateGame.anticipationIndex === null) {
		stateGame.anticipationIndex = firstSpinningCellIndex();
	}
};

export const onAnticipationCellLand = (landedIndex: number) => {
	if (stateGame.anticipationIndex === landedIndex) {
		stateGame.anticipationIndex = firstSpinningCellIndex();
		return;
	}
	syncScatterAnticipation();
};
