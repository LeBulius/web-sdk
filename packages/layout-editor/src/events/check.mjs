// @ts-nocheck
/**
 * Binding check used by the CLI and the Check button.
 * A static Spine fallback is ok. Legacy FE events are not bindable.
 * Win cues are not scheduled when the cash field is not greater than 0.
 */

const LEGACY = new Set([
	'wildUpgrade',
	'expandWild',
	'wildMultiplier',
	'updateExpandingWilds',
	'createBonusSnapshot',
]);

const TARGETS = new Set([
	'eachRevealedSymbol',
	'winningPositions',
	'swappedPositions',
	'expandedReels',
	'global',
]);

function issue(level, code, message) {
	return { level, code, message };
}

function winCash(event) {
	if (event.type === 'winInfo') {
		if (typeof event.win === 'number') return event.win;
		if (typeof event.totalWin === 'number') return event.totalWin;
		return 0;
	}
	if (event.type === 'setWin') {
		if (typeof event.win === 'number') return event.win;
		if (typeof event.amount === 'number') return event.amount;
		return 0;
	}
	return null;
}

function schedule(audio, events) {
	const files = audio.files ?? {};
	const last = new Map();
	const doubleFires = [];
	const cues = [];
	events.forEach((event, index) => {
		const cash = winCash(event);
		if (cash !== null && cash <= 0) return;
		const now = index * 200;
		const rows = audio.events?.[event.type] ?? [];
		const names = [];
		for (const row of rows) {
			if (!row?.cue) continue;
			const hits = row.on === 'perItem'
				? Math.max(1, (event.positions ?? event.newPositions ?? event.newWilds ?? event.explodingSymbols ?? []).length || 1)
				: row.on === 'perReelStop'
					? Math.max(1, Array.isArray(event.board) ? event.board.length : 1)
					: 1;
			const limited = row.maxVoices !== undefined ? Math.min(hits, row.maxVoices) : hits;
			const step = row.on === 'once' ? 0 : (row.staggerMs ?? 80);
			for (let hit = 0; hit < limited; hit += 1) names.push([row.cue, now + hit * step]);
		}
		if (event.type === 'setWin' && typeof event.winLevel === 'number') {
			const cue = audio.winlevels?.[String(event.winLevel)];
			if (cue) names.push([cue, now]);
		}
		for (const [cue, at] of names) {
			if (!files[cue]) continue;
			const prev = last.get(cue);
			if (prev !== undefined && at - prev < 50) doubleFires.push(`${cue} at ${at}ms`);
			else last.set(cue, at);
			cues.push(cue);
		}
	});
	return { cues, doubleFires };
}

function skeletonRecord(spine, key) {
	if (!key) return null;
	const direct = spine[key];
	if (direct && typeof direct === 'object' && typeof direct.skeleton === 'string' && typeof direct.atlas === 'string') return direct;
	const via = spine.items?.[key]?.skeleton;
	if (typeof via === 'string') return skeletonRecord(spine, via);
	return null;
}

export function checkBindings({ builder, catalogue, rounds }) {
	if (!builder || !catalogue) return { available: false, reason: 'not available' };
	const types = new Set((catalogue.events ?? []).map((event) => event.type).filter(Boolean));
	const issues = [];
	const spine = builder.spine ?? {};
	const audio = builder.audio ?? {};
	const art = builder.art ?? {};

	const known = (name, where) => {
		if (!name) return;
		if (LEGACY.has(name) || (types.size > 0 && !types.has(name))) {
			issues.push(issue('error', 'invalid-binding', `${where} binds "${name}", which is not in the catalogue`));
		}
	};

	(spine.eventMap ?? []).forEach((row, index) => {
		known(row?.bookEvent, `spine.eventMap[${index}]`);
		if (row?.target && !TARGETS.has(row.target)) {
			issues.push(issue('error', 'target', `spine.eventMap[${index}].target is not a known target`));
		}
		const record = skeletonRecord(spine, row?.skeleton);
		if (record?.animations && row?.anim && !record.animations.includes(row.anim)) {
			issues.push(issue('error', 'unknown-anim', `spine.eventMap[${index}] animation "${row.anim}" is not in ${row.skeleton}`));
		}
	});

	for (const [name, rows] of Object.entries(audio.events ?? {})) {
		if (Array.isArray(rows) && rows.length === 0) continue;
		known(name, 'audio.events');
		for (const row of rows ?? []) {
			if (row?.cue && !(audio.files ?? {})[row.cue]) {
				issues.push(issue('error', 'dangling', `audio cue "${row.cue}" is not in the sprite`));
			}
		}
	}

	const silent = new Set(audio.silent ?? []);
	if (types.has('contrabandSwap')) {
		const rows = audio.events?.contrabandSwap ?? [];
		const bound = rows.some((row) => row?.cue && (audio.files ?? {})[row.cue]);
		if (!bound) issues.push(issue('error', 'missing', 'contrabandSwap has no cue'));
	}
	for (let level = 1; level <= 9; level += 1) {
		const cue = audio.winlevels?.[String(level)];
		if (!cue || !(audio.files ?? {})[cue]) issues.push(issue('error', 'winlevel', `winLevel ${level} has no cue`));
	}
	for (const type of types) {
		if (type === 'setWin' || type === 'contrabandSwap') continue;
		const rows = audio.events?.[type];
		const bound = (rows ?? []).some((row) => row?.cue && (audio.files ?? {})[row.cue]);
		if (bound || silent.has(type) || (Array.isArray(rows) && rows.length === 0)) {
			if (!bound) issues.push(issue('ok', 'silent', `${type} is deliberately silent`));
			continue;
		}
		issues.push(issue('warning', 'missing', `${type} has no cue`));
	}

	for (const id of Object.keys(art.slots ?? {})) {
		if (!skeletonRecord(spine, id)) {
			issues.push(issue('ok', 'static-fallback', `${id} uses the static WebP`));
		}
	}

	const modes = rounds?.modes ?? {};
	for (const [mode, entry] of Object.entries(modes)) {
		for (const sample of entry.samples ?? []) {
			if (!Array.isArray(sample.events)) continue;
			const played = schedule(audio, sample.events);
			for (const fire of played.doubleFires) {
				issues.push(issue('error', 'double-fire', `${mode} round ${sample.id}: ${fire}`));
			}
		}
	}

	return { available: true, issues };
}
