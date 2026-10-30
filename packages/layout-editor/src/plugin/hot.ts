import path from 'node:path';

import { validateBuilderFile, type BuilderFile } from '../builder.schema';
import type { EchoTracker } from './echo';
import { hashSections } from './hash';

export const HMR_EVENT = 'layout-editor:update';

/**
 * Returns [] to swallow Vite's default update (no page reload).
 * Returns undefined when the file is not ours.
 */
export function handleBuilderHotUpdate(options: {
	file: string;
	content: string;
	builderPath: string;
	outputRoot: string;
	echo: EchoTracker;
	send: (payload: { data: BuilderFile; hashes: ReturnType<typeof hashSections> }) => void;
	invalidate: () => void;
	warn: (message: string) => void;
}): [] | void {
	const file = path.resolve(options.file);
	if (file === path.resolve(options.builderPath)) {
		options.invalidate();
		if (options.echo.consume(options.content)) return [];
		try {
			const data = JSON.parse(options.content) as BuilderFile;
			const errors = validateBuilderFile(data);
			if (errors.length) {
				options.warn(`[layout-editor] ignoring invalid builder.json:\n  ${errors.join('\n  ')}`);
				return [];
			}
			options.send({ data, hashes: hashSections(data) });
		} catch (error) {
			options.warn(`[layout-editor] builder.json is not valid JSON yet: ${String(error)}`);
		}
		return [];
	}
	const root = path.resolve(options.outputRoot);
	if (file === root || file.startsWith(root + path.sep)) {
		if (options.echo.consumeAsset(file)) return [];
	}
}
