<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { Container, type ContainerProps } from 'pixi-svelte';

	type Props = ContainerProps & {
		show: boolean;
		persistent?: boolean;
		duration?: number;
		oncomplete?: () => void;
	};

	const { show, persistent, duration, oncomplete, children, ...restProps }: Props = $props();
	const alpha = new Tween(show ? 1 : 0, { duration: duration });

	$effect(() => {
		const target = show ? 1 : 0;
		const complete = oncomplete;
		// Always settle the promise even when already at the target alpha.
		void alpha.set(target, { duration: duration }).then(() => complete?.());
	});

	onMount(async () => {
		if (show) {
			await alpha.set(0, { duration: 0 });
			await alpha.set(1);
			oncomplete?.();
		}
	});
</script>

{#if alpha.current > 0 || persistent}
	<Container
		{...restProps}
		alpha={alpha.current}
		eventMode={show ? restProps.eventMode : 'none'}
		interactiveChildren={show}
	>
		{@render children()}
	</Container>
{/if}
