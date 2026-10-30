import { getContextLayout } from 'utils-layout';

/** Hover art is desktop-only — mobile/touch layouts use default + pressed/active. */
export const createHoverSpritesDerived = () => {
	const { stateLayoutDerived } = getContextLayout();
	return () => stateLayoutDerived.layoutType() === 'desktop';
};
