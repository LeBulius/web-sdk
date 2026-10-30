<script lang="ts" module>
	export type EmitterEventBonusIntro =
		| { type: 'bonusIntroShow' }
		| { type: 'bonusIntroHide' }
		| {
				type: 'bonusIntroUpdate';
				totalFreeSpins?: number;
				modeKey: string;
				kind?: 'trigger' | 'retrigger' | 'feature';
		  };
</script>

<script lang="ts">
	import { Container, Text, REM } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { stateUi, stateUrlDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { getBonusIntroCopy, getMysteryHint, normalizeBonusMode } from '../game/bonusMeta';
	import { gameT } from '../i18n/i18nDerived';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let show = $state(false);
	let title = $state('');
	let subtitle = $state('');
	let body = $state('');
	let spinsLine = $state('');
	let oncomplete = $state(() => {});
	let dismissed = $state(false);

	const isReplay = () => stateUi.config.mode === 'replay' || stateUrlDerived.replay();

	const dismiss = () => {
		if (dismissed) return;
		dismissed = true;
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		bonusIntroShow: () => {
			dismissed = false;
			show = true;
		},
		bonusIntroHide: () => (show = false),
		bonusIntroUpdate: async (emitterEvent) => {
			const mode = normalizeBonusMode(emitterEvent.modeKey);
			const copy = getBonusIntroCopy(mode);
			const kind = emitterEvent.kind ?? 'trigger';

			if (kind === 'retrigger') {
				title = gameT('RETRIGGER');
				subtitle = copy.title;
				body = gameT('RETRIGGER BODY');
				spinsLine =
					emitterEvent.totalFreeSpins != null
						? `${emitterEvent.totalFreeSpins} ${gameT('FREE SPINS')} TOTAL`
						: '';
			} else if (kind === 'feature') {
				title = copy.title;
				subtitle = copy.subtitle;
				body = copy.body;
				spinsLine = gameT('TAP TO SPIN');
			} else {
				title = copy.title;
				subtitle = copy.subtitle;
				body =
					mode === 'bonus_mystery' && emitterEvent.totalFreeSpins != null
						? `${copy.body}\n${getMysteryHint(emitterEvent.totalFreeSpins)}`
						: copy.body;
				spinsLine =
					emitterEvent.totalFreeSpins != null
						? `${emitterEvent.totalFreeSpins} ${gameT('FREE SPINS')}`
						: '';
			}

			dismissed = false;
			const tap = waitForResolve((resolve) => (oncomplete = resolve));
			if (isReplay()) {
				await Promise.race([tap, waitForTimeout(900)]);
				dismiss();
				return;
			}
			await tap;
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x05080c} backgroundAlpha={0.82} />

	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.46}
		>
			<Text
				anchor={0.5}
				y={-REM * 2.4}
				text={subtitle}
				style={{
					fontFamily: 'Outfit SemiBold',
					fontSize: REM * 0.85,
					fontWeight: '600',
					fill: 0xffcc66,
					letterSpacing: 3,
				}}
			/>
			<Text
				anchor={0.5}
				y={-REM * 0.9}
				text={title}
				style={{
					fontFamily: 'Outfit SemiBold',
					fontSize: REM * 2.4,
					fontWeight: '800',
					fill: 0xffffff,
					letterSpacing: 6,
					align: 'center',
					wordWrap: true,
					wordWrapWidth: context.stateLayoutDerived.mainLayout().width * 0.8,
				}}
			/>
			<Text
				anchor={0.5}
				y={REM * 1.1}
				text={body}
				style={{
					fontFamily: 'Outfit SemiBold',
					fontSize: REM * 0.85,
					fontWeight: '500',
					fill: 0xd7dde8,
					align: 'center',
					wordWrap: true,
					wordWrapWidth: context.stateLayoutDerived.mainLayout().width * 0.72,
					lineHeight: REM * 1.15,
				}}
			/>
			{#if spinsLine}
				<Text
					anchor={0.5}
					y={REM * 3.2}
					text={spinsLine}
					style={{
						fontFamily: 'Outfit SemiBold',
						fontSize: REM * 1.1,
						fontWeight: '700',
						fill: 0xffe08a,
						letterSpacing: 2,
					}}
				/>
			{/if}
		</Container>
	</MainContainer>

	<PressToContinue onpress={dismiss} />
</FadeContainer>
