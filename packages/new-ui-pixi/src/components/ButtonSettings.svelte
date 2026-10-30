<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import UiButton from './UiButton.svelte';
	import { UI_BASE_SIZE } from '../constants';

	type Props = Partial<Omit<ButtonProps, 'children'>> & {
		isOpen?: boolean;
		onclick?: () => void;
	};

	const { isOpen = false, onclick, ...props }: Props = $props();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };

	const onpress = () => {
		onclick?.();
	};
</script>

<UiButton {...props} {sizes} {onpress} icon="settings" />
