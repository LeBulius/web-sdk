/**
 * Step C, part 1: mobile orientation (specs/ui_split_and_orientation.md).
 * Rule: h > w → mobile portrait; w > h with a coarse pointer → mobile landscape; else desktop family.
 */
import { describe, expect, it } from 'vitest';

import {
	MOBILE_LANDSCAPE_KEYS,
	ORIENTATION_TWIN,
	VIEWPORT_KEYS,
	VIEWPORTS,
	ancestorChain,
	emptyBuilderFile,
	normalizeBuilderFile,
	pickViewport,
	resolveActiveViewport,
	validateBuilderFile,
	viewportFamily,
	type BuilderFile,
} from '../src/builder.schema';
import { keysForScope, patchNodeItems } from '../src/mutate';
import { layoutFindings } from '../src/layout/guards';
import { uiBand, type UiFile } from '../../ui-builder/src/ui.schema';
import sharedUiJson from '../../ui-builder/ui.json';

const sharedUi = sharedUiJson as unknown as UiFile;

describe('orientation selection rule', () => {
	it('picks the family from shape and pointer', () => {
		expect(viewportFamily(375, 667, 'coarse')).toBe('portrait');
		expect(viewportFamily(375, 667, 'fine')).toBe('portrait');
		expect(viewportFamily(667, 375, 'coarse')).toBe('mobileLandscape');
		expect(viewportFamily(667, 375, 'fine')).toBe('landscape');
		expect(viewportFamily(1200, 675, 'fine')).toBe('landscape');
		// a touch laptop / tablet in landscape with a coarse pointer is still w > h + coarse
		expect(viewportFamily(1024, 768, 'coarse')).toBe('mobileLandscape');
		// square: neither h > w nor w > h → desktop family
		expect(viewportFamily(600, 600, 'coarse')).toBe('landscape');
	});

	it('maps the spec sizes to the landscape keys with a coarse pointer', () => {
		expect(pickViewport(812, 425, 'coarse')).toBe('mobileL_land');
		expect(pickViewport(667, 375, 'coarse')).toBe('mobileM_land');
		expect(pickViewport(568, 320, 'coarse')).toBe('mobileS_land');
		expect(pickViewport(844, 390, 'coarse')).toBe('mobileM_land');
		expect(pickViewport(480, 300, 'coarse')).toBe('mobileS_land');
		// fine pointer keeps the step-B behaviour (desktop family)
		expect(pickViewport(844, 390, 'fine')).toBe('popoutS');
		expect(pickViewport(667, 375)).toBe('popoutS');
		expect(pickViewport(375, 667, 'coarse')).toBe('mobileM');
	});

	it('lets the dev picker override the rule', () => {
		expect(resolveActiveViewport(667, 375, 'desktop', 'coarse')).toBe('desktop');
		expect(resolveActiveViewport(1200, 675, 'mobileS_land', 'fine')).toBe('mobileS_land');
		expect(resolveActiveViewport(667, 375, null, 'coarse')).toBe('mobileM_land');
	});
});

describe('landscape keys', () => {
	it('have the spec sizes and inheritance chain', () => {
		expect([VIEWPORTS.mobileL_land.w, VIEWPORTS.mobileL_land.h]).toEqual([812, 425]);
		expect([VIEWPORTS.mobileM_land.w, VIEWPORTS.mobileM_land.h]).toEqual([667, 375]);
		expect([VIEWPORTS.mobileS_land.w, VIEWPORTS.mobileS_land.h]).toEqual([568, 320]);
		expect(ancestorChain('mobileS_land')).toEqual(['mobileL', 'mobileL_land', 'mobileM_land', 'mobileS_land']);
		expect(ORIENTATION_TWIN.mobileM).toBe('mobileM_land');
		expect(ORIENTATION_TWIN.mobileM_land).toBe('mobileM');
	});

	it('are part of the "*" (All sizes) scope', () => {
		const all = keysForScope('all', 'desktop');
		for (const key of MOBILE_LANDSCAPE_KEYS) expect(all).toContain(key);
		expect(all).toEqual([...VIEWPORT_KEYS]);
		const file = emptyBuilderFile();
		patchNodeItems(file, 'logo', all, { x: 5 });
		expect(file.layout.viewports.mobileM_land.items.logo).toMatchObject({ x: 5 });
	});

	it('load step-B files without landscape keys and validate', () => {
		const old = emptyBuilderFile() as BuilderFile;
		for (const key of MOBILE_LANDSCAPE_KEYS) delete (old.layout.viewports as Partial<BuilderFile['layout']['viewports']>)[key];
		expect(validateBuilderFile(old)).toEqual([]);
		const normal = normalizeBuilderFile(old);
		for (const key of MOBILE_LANDSCAPE_KEYS) expect(normal.layout.viewports[key]).toBeDefined();
	});

	it('mobile landscape band starts at 110 and inherits', () => {
		expect(uiBand(sharedUi, 'mobileL_land')).toBe(110);
		expect(uiBand(sharedUi, 'mobileS_land')).toBe(110);
		expect(sharedUi.guardRails.previewInsets.mobileM_land).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
	});

	it('reports landscape misfits as amber warnings, never red', () => {
		const file = emptyBuilderFile();
		// portrait position near the bottom: fine in portrait, overlaps the landscape band
		patchNodeItems(file, 'plaque', ['mobileL'], { x: 100, y: 520 });
		file.layout.viewports.mobileL.items.plaque!.w = 60;
		file.layout.viewports.mobileL.items.plaque!.h = 30;
		const findings = layoutFindings(file, () => ({ x: 0, y: 0 }), 'en', sharedUi);
		const land = findings.filter((finding) => finding.viewport && MOBILE_LANDSCAPE_KEYS.includes(finding.viewport as never));
		expect(land.length).toBeGreaterThan(0);
		expect(land.every((finding) => finding.level !== 'red')).toBe(true);
		expect(land.some((finding) => finding.code === 'landscape-misfit')).toBe(true);
	});
});
