/**
 * Spine findings. A static WebP fallback is an ok result, never an error.
 * Errors are reserved for a Spine set that claims bad data (version, names, viewports).
 */
import { isLegacyFeEvent } from '../events/catalogue';

const SPINE_TARGETS = ['eachRevealedSymbol', 'winningPositions', 'swappedPositions', 'expandedReels', 'global'];
const VIEWPORT_KEYS = [
	'desktop',
	'laptop',
	'popoutL',
	'popoutS',
	'mobileL',
	'mobileM',
	'mobileS',
	'mobileL_land',
	'mobileM_land',
	'mobileS_land',
];

export type SpineIssue = {
	level: 'error' | 'warning' | 'ok';
	code: string;
	message: string;
	id?: string;
};

const SPINE_42 = /^4\.2\.\d+/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walkPremultiply(node: unknown, path: string, issues: SpineIssue[]) {
	if (Array.isArray(node)) {
		node.forEach((entry, index) => walkPremultiply(entry, `${path}[${index}]`, issues));
		return;
	}
	if (!isRecord(node)) return;
	for (const [key, value] of Object.entries(node)) {
		const next = `${path}.${key}`;
		if (key === 'premultipliedAlpha') {
			issues.push({
				level: 'error',
				code: 'pma-field',
				message: `${next} is not stored; pma comes from the atlas flag`,
			});
		}
		walkPremultiply(value, next, issues);
	}
}

function skeletonRecord(spine: Record<string, unknown>, key: string): Record<string, unknown> | null {
	const direct = spine[key];
	if (isRecord(direct) && (typeof direct.skeleton === 'string' || Array.isArray(direct.animations))) return direct;
	const nested = spine.skeletons;
	if (isRecord(nested) && isRecord(nested[key])) return nested[key];
	return null;
}

/** Structural errors only. Static fallback is not one of them. */
export function spineSectionErrors(spine: unknown): string[] {
	return validateSpineSection(spine)
		.filter((issue) => issue.level === 'error')
		.map((issue) => issue.message);
}

export function validateSpineSection(spine: unknown): SpineIssue[] {
	if (!isRecord(spine)) return [{ level: 'error', code: 'spine', message: 'spine must be an object' }];
	const issues: SpineIssue[] = [];
	walkPremultiply(spine, 'spine', issues);

	for (const [key, value] of Object.entries(spine)) {
		if (!isRecord(value)) continue;
		if (typeof value.version === 'string' && !SPINE_42.test(value.version)) {
			issues.push({
				level: 'error',
				code: 'spine-version',
				id: key,
				message: `spine.${key} must be Spine 4.2.x (got ${value.version})`,
			});
		}
	}

	if (isRecord(spine.placements)) {
		for (const [id, spec] of Object.entries(spine.placements)) {
			if (!isRecord(spec)) continue;
			for (const viewport of Object.keys(spec)) {
				if (!VIEWPORT_KEYS.includes(viewport)) {
					issues.push({
						level: 'error',
						code: 'placement-viewport',
						id,
						message: `spine.placements.${id}.${viewport} is not one of the viewport keys`,
					});
				}
			}
		}
	}

	if (Array.isArray(spine.eventMap)) {
		spine.eventMap.forEach((entry, index) => {
			if (!isRecord(entry)) return;
			const bookEvent = entry.bookEvent;
			if (typeof bookEvent === 'string' && isLegacyFeEvent(bookEvent)) {
				issues.push({
					level: 'error',
					code: 'legacy-event',
					message: `spine.eventMap[${index}] ${bookEvent} is not a book event`,
				});
			}
			if (entry.target !== undefined && (typeof entry.target !== 'string' || !(SPINE_TARGETS as readonly string[]).includes(entry.target))) {
				issues.push({
					level: 'error',
					code: 'target',
					message: `spine.eventMap[${index}].target is not a known target`,
				});
			}
			const skeletonKey = typeof entry.skeleton === 'string' ? entry.skeleton : '';
			const record = skeletonKey ? skeletonRecord(spine, skeletonKey) : null;
			if (record && Array.isArray(record.animations) && typeof entry.anim === 'string') {
				const names = record.animations.filter((name): name is string => typeof name === 'string');
				if (!names.includes(entry.anim)) {
					issues.push({
						level: 'error',
						code: 'unknown-anim',
						id: skeletonKey,
						message: `spine.eventMap[${index}] animation "${entry.anim}" is not in ${skeletonKey}`,
					});
				}
			}
			if (record && Array.isArray(record.animations) && typeof entry.then === 'string') {
				const names = record.animations.filter((name): name is string => typeof name === 'string');
				if (!names.includes(entry.then)) {
					issues.push({
						level: 'error',
						code: 'unknown-anim',
						id: skeletonKey,
						message: `spine.eventMap[${index}] then "${entry.then}" is not in ${skeletonKey}`,
					});
				}
			}
		});
	}

	if (isRecord(spine.symbolSkins)) {
		const symbols = skeletonRecord(spine, 'symbols');
		const skins = symbols && Array.isArray(symbols.skins) ? symbols.skins.filter((name): name is string => typeof name === 'string') : null;
		if (skins) {
			for (const [symbol, skin] of Object.entries(spine.symbolSkins)) {
				if (typeof skin === 'string' && !skins.includes(skin)) {
					issues.push({
						level: 'error',
						code: 'unknown-skin',
						id: symbol,
						message: `spine.symbolSkins.${symbol} skin "${skin}" is not in the symbols skeleton`,
					});
				}
			}
		}
	}

	return issues;
}
