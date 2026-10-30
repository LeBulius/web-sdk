import path from 'node:path';

import { contentHash } from './hash';

/**
 * Per-write echo tracking. The starter kept a single `lastWritten` string;
 * concurrent saves need a set, so one write cannot clear the marker for another.
 * Asset writes are tracked by resolved path because Vite's text read of a
 * binary WebP does not round-trip.
 */
export function createEchoTracker() {
	const hashes = new Set<string>();
	const assets = new Set<string>();
	return {
		record(content: string) {
			hashes.add(contentHash(content));
		},
		/** true = this content was written by us. The caller must not echo it. */
		consume(content: string): boolean {
			const hash = contentHash(content);
			if (!hashes.has(hash)) return false;
			hashes.delete(hash);
			return true;
		},
		recordAsset(filePath: string) {
			assets.add(path.resolve(filePath));
		},
		consumeAsset(filePath: string): boolean {
			const resolved = path.resolve(filePath);
			if (!assets.has(resolved)) return false;
			assets.delete(resolved);
			return true;
		},
		get size() {
			return hashes.size;
		},
	};
}

export type EchoTracker = ReturnType<typeof createEchoTracker>;
