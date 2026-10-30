/**
 * Runtime safe-area insets (step C). The game reads the browser's env(safe-area-inset-*)
 * instead of stored numbers; app.html already sets viewport-fit=cover. The editor uses the
 * per-key preview insets from ui.json instead (they start at 0 and are hand-tuned).
 */
import type { Insets } from '../builder.schema';

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function readEnvSafeArea(): Insets {
	if (typeof document === 'undefined' || !document.body) return ZERO;
	const probe = document.createElement('div');
	probe.style.cssText =
		'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
		'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
	document.body.appendChild(probe);
	const style = getComputedStyle(probe);
	const insets = {
		top: parseFloat(style.paddingTop) || 0,
		right: parseFloat(style.paddingRight) || 0,
		bottom: parseFloat(style.paddingBottom) || 0,
		left: parseFloat(style.paddingLeft) || 0,
	};
	probe.remove();
	return insets;
}
