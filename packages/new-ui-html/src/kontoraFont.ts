/** Shared UI display font (same face as new-ui-pixi). */
export const KONTORA_FONT_FAMILY = 'Kontora Black';

export const KONTORA_FONT_URL = new URL('./assets/Kontora-Black.otf', import.meta.url).href;

const STYLE_ID = 'kontora-black-font-face';

/** Registers @font-face for Kontora Black (idempotent). */
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
