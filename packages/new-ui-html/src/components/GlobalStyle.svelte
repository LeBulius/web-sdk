<script lang="ts">
	import type { Snippet } from 'svelte';

	import { ensureKontoraFontFace } from '../kontoraFont';
	import './global.scss';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	// Register before any HTML UI text paints (avoids Typekit / system fallback flash).
	ensureKontoraFontFace();
</script>

{@render props.children()}
