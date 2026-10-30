<script lang="ts">
	import { blur } from 'svelte/transition';
	import { onMount, type Snippet } from 'svelte';

	import { waitForTimeout } from 'utils-shared/wait';

	import OnHotkey from './OnHotkey.svelte';

	type Props = {
		children: Snippet;
		zIndex: number;
		persistent?: boolean;
		/** When false, only the X (and Escape, if enabled) close — backdrop clicks do nothing. Default true. */
		closeOnBackdrop?: boolean;
		/** When false, Escape does not close. Default true. */
		closeOnEscape?: boolean;
		/** Optional image URL for the close control (e.g. new-ui-html close.webp). */
		closeIconSrc?: string;
		onclose: () => void;
	};

	const props: Props = $props();

	const zIndexInternal = {
		topLayer: 2,
		clickToCloseLayer: 2,
		closeButton: 101,
		contentLayer: 100,
	};

	const closeOnBackdrop = $derived(props.closeOnBackdrop ?? true);
	const closeOnEscape = $derived(props.closeOnEscape ?? true);

	const closeModal = () => (props.persistent ? undefined : props.onclose());
	const onBackdropClick = () => {
		if (props.persistent || !closeOnBackdrop) return;
		props.onclose();
	};

	let disabled = $state(true);

	onMount(async () => {
		await waitForTimeout(300);

		disabled = false;
	});
</script>

{#if closeOnEscape && !props.persistent}
	<OnHotkey hotkey="Escape" onpress={closeModal} />
{/if}

<div class="pop-up-wrap" class:disabled style={`z-index: ${props.zIndex};`}>
	<div class="blur-layer"></div>
	<div
		class="top-layer"
		style="--zIndex: {zIndexInternal.topLayer}"
		in:blur={{ duration: 300, opacity: 0 }}
	>
		<div
			tabindex={closeOnBackdrop ? 0 : -1}
			class="click-to-close-layer"
			class:inert={!closeOnBackdrop}
			onclick={onBackdropClick}
			onkeypress={onBackdropClick}
			role="button"
			style="--zIndex: {zIndexInternal.clickToCloseLayer}"
		></div>

		{#if !props.persistent}
			<div class="close-button-wrap" style="--zIndex: {zIndexInternal.closeButton}">
				<button
					class="close-button"
					class:has-icon={Boolean(props.closeIconSrc)}
					data-test="close-button"
					aria-label="Close"
					onclick={closeModal}
				>
					{#if props.closeIconSrc}
						<img src={props.closeIconSrc} alt="" class="close-icon" />
					{:else}
						×
					{/if}
				</button>
			</div>
		{/if}
		<div class="content-layer" style="--zIndex: {zIndexInternal.contentLayer}">
			{@render props.children()}
		</div>
	</div>
</div>

<style lang="scss">
	.pop-up-wrap {
		font-family: 'proxima-nova', sans-serif;
		touch-action: manipulation;
		color: white;
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;

		display: flex !important;
		justify-content: center;
		align-items: center;

		&.disabled {
			pointer-events: none;
		}
	}

	.blur-layer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
	}

	.top-layer {
		width: 100%;
		height: 100%;
		z-index: var(--zIndex);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.click-to-close-layer {
		z-index: var(--zIndex);

		position: absolute;
		width: 100%;
		height: 100%;

		&.inert {
			pointer-events: none;
		}
	}

	.content-layer {
		position: relative;
		z-index: var(--zIndex);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.content-layer > :global(*) {
		pointer-events: auto;
	}

	.close-button-wrap {
		position: absolute;
		top: 0;
		right: 0;
		z-index: var(--zIndex);
	}

	.close-button {
		cursor: pointer;
		color: white;
		font-size: 3rem;
		font-weight: 900;
		background-color: transparent;
		border: none;
		line-height: 0;
		width: 3rem;
		height: 3rem;
	}

	.close-button.has-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.65rem;
		margin: 0.35rem;
		width: 3.25rem;
		height: 3.25rem;
		font-size: 0;
	}

	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		pointer-events: none;
		/* Sprite has a black plate — screen blend drops it on dark overlays */
		mix-blend-mode: screen;
	}
</style>
