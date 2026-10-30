/**
 * One check for the CLI (`pnpm builder:check`) and the shell's Check button. Browser-safe:
 * the caller loads the files.
 *
 * - bindings (step B check.mjs, unchanged)
 * - shared UI: ui.json validation (scope:game bindings rejected), the game's pin, clamped
 *   uiOverrides, optional ui.skin.json, legacy chrome still in builder.json
 * - mobile landscape: findings on the three landscape keys are WARNINGS (sign-off: "failing on
 *   landscape until relaid out is a warning, not a crash")
 */
import { checkBindings } from '../events/check.mjs';
import { isMobileLandscapeKey, type BuilderFile, type ViewportKey } from '../builder.schema';
import { formulaFor, layoutFindings } from '../layout/guards';
import { BOARD_FRAME_LAYOUT } from '../layout/migrate';
import {
	overrideIssues,
	pinIssues,
	pinnedUi,
	validateSkin,
	validateUiFile,
	type CatalogueLike,
	type UiFile,
} from '../../../ui-builder/src/ui.schema';

export type CheckIssue = { level: 'error' | 'warning' | 'ok'; code: string; message: string; viewport?: ViewportKey };

/** A warning that only concerns the mobile-landscape keys (misfits are warnings, never errors). */
export const isLandscapeIssue = (issue: CheckIssue): boolean =>
	issue.code.startsWith('landscape') || (issue.viewport !== undefined && isMobileLandscapeKey(issue.viewport));

export function runGameCheck(input: {
	builder: BuilderFile;
	catalogue: CatalogueLike;
	rounds?: unknown;
	uiHead: UiFile | null;
	uiReleases: Record<string, UiFile>;
	skin?: unknown;
	locale?: string;
}): { available: boolean; issues: CheckIssue[] } {
	const issues: CheckIssue[] = [];
	const bindings = checkBindings({ builder: input.builder, catalogue: input.catalogue, rounds: input.rounds });
	if (bindings.available) issues.push(...((bindings.issues ?? []) as CheckIssue[]));
	else issues.push({ level: 'warning', code: 'bindings', message: 'binding check not available (no catalogue)' });

	for (const event of input.catalogue?.events ?? []) {
		if (event.scope !== 'generic' && event.scope !== 'game') {
			issues.push({ level: 'warning', code: 'catalogue-scope', message: `catalogue event ${event.type} has no scope (run pnpm builder:rounds)` });
		}
	}

	const pin = input.builder.ui?.pin;
	issues.push(...pinIssues({ head: input.uiHead, releases: input.uiReleases, pin }));
	if (input.uiHead) {
		for (const issue of validateUiFile(input.uiHead, { catalogue: input.catalogue })) {
			issues.push({ ...issue, message: `ui.json: ${issue.message}` });
		}
	} else {
		issues.push({ level: 'error', code: 'ui-missing', message: 'packages/ui-builder/ui.json not found' });
	}
	const ui = pinnedUi(input.uiHead, input.uiReleases, pin);
	if (ui && ui !== input.uiHead) {
		for (const issue of validateUiFile(ui, { catalogue: input.catalogue })) {
			issues.push({ ...issue, message: `ui release ${ui.version}: ${issue.message}` });
		}
	}
	if (ui) issues.push(...overrideIssues(ui, input.builder.ui));
	if (input.builder.layout.reserved?.controlBar && Object.keys(input.builder.layout.reserved.controlBar).length) {
		issues.push({ level: 'warning', code: 'legacy-chrome', message: 'builder.json layout.reserved.controlBar is ignored: the band lives in ui.json (use uiOverrides["controlBar.band"])' });
	}
	if (input.builder.layout.popups) {
		issues.push({ level: 'warning', code: 'legacy-chrome', message: 'builder.json layout.popups is ignored: popups live in ui.json' });
	}
	if (input.skin !== undefined) {
		for (const issue of validateSkin(input.skin, ui)) issues.push(issue);
	}

	const findings = layoutFindings(
		input.builder,
		formulaFor(input.builder.layout.frame ?? BOARD_FRAME_LAYOUT),
		input.locale ?? 'en',
		ui,
	);
	for (const finding of findings) {
		if (!finding.viewport || !isMobileLandscapeKey(finding.viewport)) continue;
		issues.push({ level: 'warning', code: finding.code, message: finding.message, viewport: finding.viewport });
	}
	return { available: true, issues };
}
