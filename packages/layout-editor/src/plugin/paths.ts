import path from 'node:path';

export function insideRoot(root: string, target: string): boolean {
	const resolvedRoot = path.resolve(root);
	const resolved = path.resolve(target);
	return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
}

export function safeKey(key: string): string | null {
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(key)) return null;
	return key;
}

export function safeBasename(filename: string): string | null {
	const base = path.basename(filename).replace(/\\/g, '/');
	if (!base || base === '.' || base === '..') return null;
	if (base.includes('/') || base.includes('\0')) return null;
	return base;
}
