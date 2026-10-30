/** Weighted ways: each cell multiplier adds ways on that reel. All ×1 = 3×5×5×3 = 225. */
export const gridWaysCount = (grid: number[][]) =>
	grid.reduce((product, reel) => {
		const reelSum = reel.reduce((sum, mult) => sum + Math.max(0, Number(mult) || 0), 0);
		return product * reelSum;
	}, 1);

export const formatWaysCount = (value: number) => String(Math.round(value));
