<script lang="ts">
	import { onMount } from 'svelte';

	import { Text } from 'pixi-svelte';
	import { stateBet, stateStorybook, stateUi, stateUrlDerived } from 'state-shared';

	import { gameActor } from '../game/actor';
	import { getContext } from '../game/context';

	type Props = {
		debug?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	const playLocalBook = async () => {
		if (!stateStorybook.play) return;
		await stateStorybook.play();
	};

	/** Storybook has no RGS — Spin/Auto reuse the local book Action. */
	const playLocalOrSend = async (type: 'BET' | 'AUTO_BET') => {
		if (!stateUrlDerived.rgsUrl() && stateStorybook.play) {
			if (type === 'BET') {
				await playLocalBook();
				return;
			}

			// Local autoplay loop (xstate AUTO_BET needs RGS bet responses).
			while (stateBet.autoSpinsCounter > 0 && stateStorybook.play) {
				await playLocalBook();
				if (stateBet.autoSpinsCounter !== Infinity) {
					stateBet.autoSpinsCounter = Math.max(0, stateBet.autoSpinsCounter - 1);
				}
			}
			return;
		}

		gameActor.send({ type });
	};

	onMount(() => {
		const { unsubscribe } = gameActor.subscribe((snapshot) => {
			context.stateXstate.value = snapshot.value;
		});

		gameActor.start();
		gameActor.send({ type: 'RENDERED' });

		return () => {
			unsubscribe();
			gameActor.stop();
		};
	});

	context.eventEmitter.subscribeOnMount({
		bet: () => {
			if (stateUi.config.mode === 'replay' || stateUrlDerived.replay()) return;
			void playLocalOrSend('BET');
		},
		autoBet: () => {
			if (stateUi.config.mode === 'replay' || stateUrlDerived.replay()) return;
			void playLocalOrSend('AUTO_BET');
		},
		resumeBet: () => gameActor.send({ type: 'RESUME_BET' }),
	});
</script>

{#if props.debug}
	<Text
		x={context.stateLayoutDerived.canvasSizes().width}
		anchor={{ x: 1, y: 0 }}
		style={{ fill: 0xffffff }}
		text={JSON.stringify(context.stateXstate.value, undefined, 2)}
	/>
{/if}
