<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'new-ui-html';
	import { ensureOutfitFontFace, preloadOutfitFont } from '../game/outfitFont';
	import { Authenticate, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	setContext();

	ensureOutfitFontFace();
	void preloadOutfitFont();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{@render props.children()}