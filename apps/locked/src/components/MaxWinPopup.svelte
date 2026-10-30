<script lang="ts" module>
	export type EmitterEventMaxWinPopup =
		| { type: 'maxWinPopupShow' }
		| { type: 'maxWinPopupHide' }
		| { type: 'maxWinPopupAwait' };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { gameT } from '../i18n/i18nDerived';

	const context = getContext();

	let show = $state(false);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		maxWinPopupShow: () => {
			show = true;
		},
		maxWinPopupHide: () => {
			show = false;
		},
		maxWinPopupAwait: async () => {
			show = true;
			await waitForResolve((resolve) => {
				oncomplete = resolve;
			});
			show = false;
		},
	});

	const dismiss = () => oncomplete();
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" onclick={dismiss} role="presentation">
		<div
			class="card"
			role="dialog"
			tabindex="-1"
			aria-labelledby="max-win-popup-title"
			aria-modal="true"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<h2 id="max-win-popup-title" class="title">{gameT('CONGRATULATIONS')}</h2>
			<p class="body">{gameT('MAX WIN BODY')}</p>
			<button class="ok" type="button" data-test="max-win-popup-ok" onclick={dismiss}>{gameT('OK')}</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.62);
		font-family: 'Outfit SemiBold', sans-serif;
	}

	.card {
		width: min(22rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		padding: 1.75rem 1.5rem 1.4rem;
		background: #0a0a0a;
		border: 1px solid #e0a33a;
		border-radius: 2px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
	}

	.title {
		margin: 0;
		color: #e0a33a;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-align: center;
		text-transform: uppercase;
	}

	.body {
		margin: 0;
		max-width: 18rem;
		color: #ffffff;
		font-size: 0.95rem;
		font-weight: 400;
		line-height: 1.45;
		text-align: center;
	}

	.ok {
		margin-top: 0.35rem;
		min-width: 7.5rem;
		padding: 0.65rem 1.75rem;
		border: none;
		border-radius: 999px;
		background: #e0a33a;
		color: #0a0a0a;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: filter 120ms ease;
	}

	.ok:hover {
		filter: brightness(1.08);
	}

	.ok:active {
		filter: brightness(0.95);
	}
</style>
