/** Canonical UI display font for new-ui-pixi / new-ui-html. */
export const KONTORA_FONT_FAMILY = 'Kontora Black';

/** Vite-resolved URL to the shared Kontora Black OTF. */
export const KONTORA_FONT_URL = new URL(
	'../assets/fonts/Kontora-Black.otf',
	import.meta.url,
).href;

const STYLE_ID = 'kontora-black-font-face';

/**
 * Registers @font-face for Kontora Black (idempotent).
 * Prefer calling early (layout / GlobalStyle) so Pixi + HTML UI share one face.
 */
export function ensureKontoraFontFace() {
	if (typeof document === 'undefined') return;
	if (document.getElementById(STYLE_ID)) return;

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
@font-face {
	font-family: '${KONTORA_FONT_FAMILY}';
	src: url('${KONTORA_FONT_URL}') format('opentype');
	font-weight: 100 900;
	font-style: normal;
	font-display: block;
}
`;
	document.head.appendChild(style);
}

/** Wait until Kontora is usable at the weights Pixi/UI sample. */
export async function preloadKontoraFont() {
	ensureKontoraFontFace();
	if (typeof document === 'undefined' || !document.fonts?.load) return;

	try {
		await Promise.all([
			document.fonts.load(`900 48px '${KONTORA_FONT_FAMILY}'`),
			document.fonts.load(`700 48px '${KONTORA_FONT_FAMILY}'`),
			document.fonts.load(`600 48px '${KONTORA_FONT_FAMILY}'`),
			document.fonts.load(`400 48px '${KONTORA_FONT_FAMILY}'`),
		]);
		await document.fonts.ready;
	} catch (error) {
		console.error(error);
	}
}
