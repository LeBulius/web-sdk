/** Locked In display font. Also aliased as Kontora Black so shared UI in this app uses Outfit. */
export const DISPLAY_FONT_FAMILY = 'Outfit SemiBold';

export const DISPLAY_FONT_URL = new URL(
	'../assets/fonts/Outfit-SemiBold.ttf',
	import.meta.url,
).href;

const OUTFIT_STYLE_ID = 'outfit-semibold-font-face';
const KONTORA_STYLE_ID = 'kontora-black-font-face';

const fontFaceCss = (family: string) => `
@font-face {
	font-family: '${family}';
	src: url('${DISPLAY_FONT_URL}') format('truetype');
	font-weight: 100 900;
	font-style: normal;
	font-display: block;
}
`;

const upsertFontFace = (id: string, family: string) => {
	if (typeof document === 'undefined') return;
	let style = document.getElementById(id);
	if (!style) {
		style = document.createElement('style');
		style.id = id;
		document.head.appendChild(style);
	}
	style.textContent = fontFaceCss(family);
};

export function ensureOutfitFontFace() {
	if (typeof document === 'undefined') return;
	upsertFontFace(OUTFIT_STYLE_ID, DISPLAY_FONT_FAMILY);
	// Shared new-ui packages still request Kontora Black — serve Outfit instead.
	upsertFontFace(KONTORA_STYLE_ID, 'Kontora Black');
}

export async function preloadOutfitFont() {
	ensureOutfitFontFace();
	if (typeof document === 'undefined' || !document.fonts?.load) return;

	try {
		await Promise.all([
			document.fonts.load(`600 48px '${DISPLAY_FONT_FAMILY}'`),
			document.fonts.load(`700 48px '${DISPLAY_FONT_FAMILY}'`),
			document.fonts.load(`600 48px 'Kontora Black'`),
			document.fonts.load(`700 48px 'Kontora Black'`),
		]);
		await document.fonts.ready;
	} catch (error) {
		console.error(error);
	}
}
