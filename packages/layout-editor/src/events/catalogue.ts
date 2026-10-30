/**
 * Dev-only hooks for SlotMath Dev's catalogue, rounds file, and binding validator.
 * Not imported by game code. Until those files ship, each call reports "not available".
 *
 * Event names for a future dropdown come from MATH_EVENTS.md or the catalogue JSON,
 * never from the game's typesBookEvent. The legacy FE names below are not bindable (M9).
 */

export const CATALOGUE_PATH = 'dev/event-catalogue.json';
export const ROUNDS_PATH = 'dev/builder_rounds.json';

/** Legacy FE events. They are not book events and must not be bindable. */
export const NON_BINDABLE_LEGACY_EVENTS = [
	'wildUpgrade',
	'expandWild',
	'wildMultiplier',
	'updateExpandingWilds',
	'createBonusSnapshot',
] as const;

export type Unavailable = { available: false; reason: 'not available' };

export function isLegacyFeEvent(name: string): boolean {
	return (NON_BINDABLE_LEGACY_EVENTS as readonly string[]).includes(name);
}

/**
 * Pull camelCase event names out of MATH_EVENTS.md. Payload field names are ignored
 * by requiring the name to appear as a heading or as a `"type"` example.
 */
export function eventNamesFromMathMarkdown(markdown: string): string[] {
	const found = new Set<string>();
	for (const match of markdown.matchAll(/^##\s+([a-z][A-Za-z0-9]+)/gm)) {
		const name = match[1];
		if (name && !isLegacyFeEvent(name)) found.add(name);
	}
	for (const match of markdown.matchAll(/"type":\s*"([a-z][A-Za-z0-9]+)"/g)) {
		const name = match[1];
		if (name && !isLegacyFeEvent(name)) found.add(name);
	}
	return [...found].sort();
}

async function loadDevJson(url: string): Promise<unknown | null> {
	if (typeof fetch !== 'function') return null;
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

/** Catalogue JSON from SlotMath Dev. null / not available until that file exists. */
export async function loadEventCatalogue(): Promise<Unavailable | { available: true; catalogue: unknown } | null> {
	const data = await loadDevJson('/' + CATALOGUE_PATH);
	if (data === null) return { available: false, reason: 'not available' };
	return { available: true, catalogue: data };
}

/** builder_rounds.json. null / not available until SlotMath Dev ships it. */
export async function loadBuilderRounds(): Promise<Unavailable | { available: true; rounds: unknown } | null> {
	const data = await loadDevJson('/' + ROUNDS_PATH);
	if (data === null) return { available: false, reason: 'not available' };
	return { available: true, rounds: data };
}

import { checkBindings } from './check.mjs';

export type BindingIssue = { level: 'error' | 'warning' | 'ok'; code: string; message: string };

/**
 * Binding validator. With no catalogue it reports not available (the acceptance hook).
 * Pass builder + catalogue (+ rounds) and it checks the real bindings.
 * A static Spine fallback is ok, not an error. Legacy FE events are not bindable.
 */
export function validateBindings(input?: {
	builder?: unknown;
	catalogue?: unknown;
	rounds?: unknown;
}): Unavailable | { available: true; issues: BindingIssue[] } {
	if (!input?.builder || !input?.catalogue) return { available: false, reason: 'not available' };
	return checkBindings({ builder: input.builder, catalogue: input.catalogue, rounds: input.rounds }) as {
		available: true;
		issues: BindingIssue[];
	};
}
