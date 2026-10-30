<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { getContextApp } from 'pixi-svelte';
	import { getContextLayout } from 'utils-layout';
	import {
		DEFAULT_BET_AMOUNT_OPTIONS,
		stateConfig,
		stateModal,
		stateStorybook,
	} from 'state-shared';

	type Props = {
		skipLoadingScreen: boolean;
		action: () => Promise<void>;
		children: Snippet;
	};

	const props: Props = $props();
	const appContext = getContextApp();
	const layoutContext = getContextLayout();

	let actionState = $state({
		running: false,
		message: 'Initialising...',
	});

	const runAction = async () => {
		if (actionState.running || stateStorybook.playing) return;

		actionState.running = true;
		stateStorybook.playing = true;
		actionState.message =
			'Running... (Make sure action is resolved eventually, or your game will get stuck)';
		try {
			await props.action();
			actionState.message = 'Action is resolved ✅';
		} finally {
			actionState.running = false;
			stateStorybook.playing = false;
		}
	};

	$effect(() => {
		if (!appContext.stateApp.loaded) return;
		layoutContext.stateLayout.showLoadingScreen = !props.skipLoadingScreen;
		if (props.skipLoadingScreen) {
			actionState.message = 'Click action or Spin to start';
		} else {
			actionState.message = 'Tap to continue on the loading screen';
		}
	});

	onMount(() => {
		// Shared game state persists across stories; clear sticky RGS errors
		// and restore a full 48-level bet ladder for menu testing.
		stateModal.modal = null;
		stateConfig.betAmountOptions = [...DEFAULT_BET_AMOUNT_OPTIONS];
		stateConfig.betMenuOptions = [...DEFAULT_BET_AMOUNT_OPTIONS];
		actionState.running = false;
		actionState.message = 'Initialising...';

		// Let in-game Spin use the same local book play as the green Action button.
		stateStorybook.play = runAction;

		// Apply skip as soon as this story mounts (assets may already be loaded).
		if (appContext.stateApp.loaded) {
			layoutContext.stateLayout.showLoadingScreen = !props.skipLoadingScreen;
			actionState.message = props.skipLoadingScreen
				? 'Click action or Spin to start'
				: 'Tap to continue on the loading screen';
		}

		return () => {
			layoutContext.stateLayout.showLoadingScreen = true;
			actionState.running = false;
			actionState.message = 'Initialising...';
			stateStorybook.playing = false;
			if (stateStorybook.play === runAction) {
				stateStorybook.play = null;
			}
		};
	});
</script>

{@render props.children()}

<div class="wrap">
	<button
		class="action"
		disabled={actionState.running || layoutContext.stateLayout.showLoadingScreen}
		onclick={runAction}
	>
		Action
	</button>
	<span class="message">ⓘ {actionState.message}</span>
</div>

<style lang="scss">
	.wrap {
		position: absolute;
		top: 0;
		z-index: 999;
		display: flex;
		flex-direction: row;
	}

	.action {
		z-index: 2;
		border: none;
		text-align: center;
		text-decoration: none;
		display: inline-flex;
		cursor: pointer;
		background-color: green;
		border-radius: 5px;
		padding: 5px;
		color: white;
		font-size: 16px;
	}

	.action:disabled {
		background-color: lightgreen;
		cursor: not-allowed;
	}

	.message {
		margin-left: -10px;
		background-color: yellow;
		padding: 5px;
		padding-left: 15px;
		color: black;
		font-size: 16px;
	}
</style>
