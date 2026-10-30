<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { Text, REM } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer
		{show}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={REM * 1.2}
	>
		<Text
			anchor={0.5}
			text={`FREE SPINS LEFT  ${current}`}
			style={{
				fontFamily: 'Outfit SemiBold',
				fontSize: REM * 0.9,
				fontWeight: '700',
				fill: 0xffe08a,
				stroke: { color: 0x000000, width: 4 },
			}}
		/>
	</FadeContainer>
</MainContainer>
