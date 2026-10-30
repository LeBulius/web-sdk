/// <reference types="vite/client" />

declare module 'virtual:layout-editor/data' {
	import type { BuilderFile, BuilderSection } from './builder.schema';
	import type { UiPayload } from '../../ui-builder/src/ui.schema';

	const data: BuilderFile;
	export const hashes: Record<BuilderSection, string>;
	/** Shared UI layer (step C). `head` is null in production builds. */
	export const ui: UiPayload;
	export default data;
}
