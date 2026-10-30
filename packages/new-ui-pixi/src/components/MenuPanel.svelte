<script lang="ts" module>
	// Wider + taller for mobile touch (scaled further in LayoutPortrait)
	export const MENU_PANEL_WIDTH = 248;
	export const MENU_PANEL_HEIGHT = 210;
</script>

<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateModal, stateSound, stateUi } from 'state-shared';

	import VolumeSlider from './VolumeSlider.svelte';
	import {
		UI_CHROME_ALPHA,
		UI_CHROME_BG,
		UI_CHROME_BORDER_ALPHA,
		UI_CHROME_BORDER_COLOR,
		UI_CHROME_BORDER_WIDTH,
		UI_CHROME_INSET_BG,
		UI_CHROME_RADIUS,
	} from '../constants';
	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';

	const context = getContext();

	const ROW_H = Math.round((MENU_PANEL_HEIGHT - 32) / 3);
	const PAD_X = 12;
	const PAD_Y = 16;
	const ROW_W = MENU_PANEL_WIDTH - PAD_X * 2;
	// Match VolumeSlider icon placement (PAD_X + ICON_SIZE / 2)
	const ICON_SIZE = 32;
	const ICON_PAD = 12;
	const ICON_GAP = 10;

	const openInfo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = false;
		stateModal.modal = { name: 'gameRules' };
	};
</script>

<Container eventMode="static">
	<Rectangle
		width={MENU_PANEL_WIDTH}
		height={MENU_PANEL_HEIGHT}
		borderRadius={UI_CHROME_RADIUS}
		backgroundColor={UI_CHROME_BG}
		alpha={UI_CHROME_ALPHA}
		borderColor={UI_CHROME_BORDER_COLOR}
		borderWidth={UI_CHROME_BORDER_WIDTH}
		borderAlpha={UI_CHROME_BORDER_ALPHA}
	/>

	<!-- INFO row -->
	<Container x={PAD_X} y={PAD_Y}>
		<Button sizes={{ width: ROW_W, height: ROW_H }} onpress={openInfo}>
			{#snippet children({ hovered })}
				<Rectangle
					width={ROW_W}
					height={ROW_H}
					borderRadius={UI_CHROME_RADIUS}
					backgroundColor={UI_CHROME_INSET_BG}
					alpha={hovered ? 1 : 0}
				/>
				<Container y={ROW_H * 0.5}>
					<Sprite
						key="info"
						width={ICON_SIZE}
						height={ICON_SIZE}
						x={ICON_PAD + ICON_SIZE * 0.5}
						anchor={0.5}
					/>
					<Text
						text={i18nDerived.info()}
						x={ICON_PAD + ICON_SIZE + ICON_GAP}
						anchor={{ x: 0, y: 0.5 }}
						style={{
							fontFamily: 'Kontora Black',
							fontWeight: '700',
							fontSize: 20,
							fill: 0xffffff,
						}}
					/>
				</Container>
			{/snippet}
		</Button>
	</Container>

	<!-- Game sounds -->
	<Container x={PAD_X} y={PAD_Y + ROW_H}>
		<VolumeSlider
			icon="speaker"
			rowWidth={ROW_W}
			rowHeight={ROW_H}
			value={stateSound.volumeValueSoundEffect}
			onchange={(v) => (stateSound.volumeValueSoundEffect = v)}
		/>
	</Container>

	<!-- Music sounds -->
	<Container x={PAD_X} y={PAD_Y + ROW_H * 2}>
		<VolumeSlider
			icon="music"
			rowWidth={ROW_W}
			rowHeight={ROW_H}
			value={stateSound.volumeValueMusic}
			onchange={(v) => (stateSound.volumeValueMusic = v)}
		/>
	</Container>
</Container>
