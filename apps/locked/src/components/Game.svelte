<script lang="ts">
	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey, OnHotkey } from 'components-shared';
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { App, Container, Rectangle, Text, REM, anchorToPivot } from 'pixi-svelte';

	import { UI, UiGameName } from 'new-ui-pixi';
	import { GameVersion, Modals, stateBonus } from 'new-ui-html';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import StartScreen from './StartScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import WaysPlaque from './WaysPlaque.svelte';
	import ScatterAnticipationOverlay from './ScatterAnticipationOverlay.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import Board from './Board.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import PositionMultipliers from './PositionMultipliers.svelte';
	import ExpandingWildOverlay from './ExpandingWildOverlay.svelte';
	import FireFramesOverlay from './FireFramesOverlay.svelte';
	import ConnectionWinAmounts from './ConnectionWinAmounts.svelte';
	import Win from './Win.svelte';
	import BonusIntro from './BonusIntro.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import MaxWinPopup from './MaxWinPopup.svelte';
	import ReplayOverlay from './ReplayOverlay.svelte';
	import GameLogo from './GameLogo.svelte';
	import {
		ABOVE_LAYERS_Z,
		BuilderShellMount,
		LayoutEditorMount,
		defineGrid,
		defineLayers,
		gridBounds,
		layerGroupVisible,
		layerGroupZ,
		layerItemZ,
		useLayout,
		useUiItem,
	} from 'layout-editor';
	import { setContext } from 'svelte';
	import { dev } from '$app/environment';
	import { REEL_ROWS, SYMBOL_SIZE } from '../game/constants';
	import { GRID_GEOMETRY, activeGrid } from '../game/grid';

	const context = getContext();
	const boardSpinning = $derived(
		context.stateGame.board.some((reel) => reel.reelState.motion === 'spinning'),
	);

	const skipBoardSpin = () => {
		if (!boardSpinning) return;
		context.eventEmitter.broadcast({ type: 'stopButtonClick' });
	};

	// layout-editor: layer groups (bottom → top) and the default item order inside each group.
	// builder.json layout.layers can reorder them (Layers panel); with no data this is the old
	// stacking order, so the game looks the same.
	defineLayers({
		background: ['background'],
		frame: ['boardFrame'],
		grid: ['board'],
		symbols: ['reelSymbols', 'tumbleSymbols', 'positionMultipliers'],
		fx: ['expandingWild', 'fireRims', 'scatterAnticipation', 'connectionWins'],
		overlay: ['gameLogo', 'waysPlaque'],
	});
	defineGrid({ cell: SYMBOL_SIZE, rows: REEL_ROWS });
	// layout-editor P5: shared UI items (ui.json ids) get a Locked In-only offset/scale/visibility
	// from builder.json ui.uiOverrides. new-ui-pixi's UiSlot reads this hook; ui.json is untouched.
	setContext('@@layout-editor/ui-item', (id: string) => useUiItem(id, { name: id }));

	// layout-editor: draggable wrappers. Defaults are identity (0,0) so the game looks the same
	// until a position is saved in src/game/builder.json.
	const logoLayout = useLayout('gameLogo', () => ({ x: 0, y: 0 }), {
		frame: 'main',
		editable: ['x', 'y', 'scale', 'visible'],
		group: 'overlay',
		name: 'Game logo',
		mode: 'offset',
		description: 'Locked In logo (GameLogo.svelte), offset from its computed position',
	});
	const plaqueLayout = useLayout('waysPlaque', () => ({ x: 0, y: 0 }), {
		frame: 'main',
		editable: ['x', 'y', 'scale', 'visible'],
		group: 'overlay',
		name: 'WAYS plaque',
		mode: 'offset',
		description: 'WAYS plaque (WaysPlaque.svelte), offset from its computed position',
	});
	const backgroundLayout = useLayout('background', () => ({ x: 0, y: 0 }), {
		frame: 'canvas',
		editable: ['x', 'y', 'scale', 'visible'],
		group: 'background',
		name: 'Background art',
		mode: 'offset',
		description: 'Background (Background.svelte), offset/scale from its cover fit',
	});
	/** Follow wrappers: positioned by the board/grid. Selectable, hide/lock/reorder only. */
	const follow = (id: string, group: string, name: string) =>
		useLayout(id, () => ({ x: 0, y: 0 }), {
			frame: 'main',
			editable: ['visible'],
			group,
			name,
			follow: true,
			description: `${name}: follows the reel grid (edit Layers → Grid)`,
		});
	const reelSymbolsLayout = follow('reelSymbols', 'symbols', 'Reel symbols');
	const tumbleLayout = follow('tumbleSymbols', 'symbols', 'Tumble symbols');
	const multipliersLayout = follow('positionMultipliers', 'symbols', 'Cell multipliers');
	const expandingLayout = follow('expandingWild', 'fx', 'Expanding wilds');
	const fireLayout = follow('fireRims', 'fx', 'Fire frames');
	const scatterLayout = follow('scatterAnticipation', 'fx', 'Scatter anticipation');
	const winsLayout = follow('connectionWins', 'fx', 'Connection win amounts');

	const gz = (group: string) => layerGroupZ(group);
	const gv = (group: string) => layerGroupVisible(group);
	const iz = (group: string, id: string) => layerItemZ(group, id);
	/** Grid hit area for picking/dragging the board in the editor (dev only, board-local). */
	const gridBox = $derived(gridBounds(activeGrid(), GRID_GEOMETRY));

	// layout-editor: the overlay draws the control-bar band / safe area and snaps in the space of a
	// stage child labelled 'design-frame'. Dev-only empty mirror of MainContainer's main frame.
	const builderFrame = $derived(context.stateLayoutDerived.mainLayout());

	// Top bar: "Opulence Gaming" is a fixed 1.5rem (24px) like the clock + game name on the left, so on
	// narrow portrait canvases (< 600px) the two texts overlapped. Scale it with the canvas width there;
	// at >= 600px wide it stays exactly 1.5rem.
	const providerFontSize = $derived(
		Math.min(REM * 1.5, context.stateLayoutDerived.canvasSizes().width * 0.04),
	);

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateBonus.detailOpen = true;
		},
	});
</script>

<App>
	<EnableSound />
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	{#if context.stateLayout.showLoadingScreen}
		<StartScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		<ResumeBet />
		<!--
			Sound starts after loading interaction (autoplay policy).
		-->
		<Sound />

		<!--
			layout-editor layer groups. Each group is one stage child (zIndex from layout.layers.groups);
			items inside get their own zIndex (layout.layers.order). Default = the old stacking order.
		-->
		<Container label="layer:background" zIndex={gz('background')} visible={gv('background')}>
			<Container {...backgroundLayout.props} zIndex={iz('background', 'background')}>
				<Background />
			</Container>
		</Container>

		<Container label="layer:frame" zIndex={gz('frame')} visible={gv('frame')}>
			<MainContainer>
				<BoardContainer>
					<BoardFrame />
				</BoardContainer>
			</MainContainer>
		</Container>

		{#if import.meta.env.DEV}
			<Container label="layer:grid" zIndex={gz('grid')} visible={gv('grid')}>
				<MainContainer>
					<BoardContainer label="board">
						<Rectangle
							eventMode="none"
							alpha={0}
							backgroundColor={0xffffff}
							x={gridBox.x}
							y={gridBox.y}
							width={gridBox.width}
							height={gridBox.height}
						/>
					</BoardContainer>
				</MainContainer>
			</Container>
		{/if}

		<Container label="layer:symbols" zIndex={gz('symbols')} visible={gv('symbols')}>
			<MainContainer>
				<Container {...reelSymbolsLayout.props} zIndex={iz('symbols', 'reelSymbols')}>
					<Board />
				</Container>
				<Container {...tumbleLayout.props} zIndex={iz('symbols', 'tumbleSymbols')}>
					<TumbleBoard />
				</Container>
				<Container {...multipliersLayout.props} zIndex={iz('symbols', 'positionMultipliers')}>
					<PositionMultipliers />
				</Container>
			</MainContainer>
		</Container>

		<Container label="layer:fx" zIndex={gz('fx')} visible={gv('fx')}>
			<!-- Sibling of the board, not inside BoardMask — expand must not clip. -->
			<MainContainer>
				<Container {...expandingLayout.props} zIndex={iz('fx', 'expandingWild')}>
					<ExpandingWildOverlay />
				</Container>
				<!-- Fire frames sit on cells, including expanded wild reels. -->
				<Container {...fireLayout.props} zIndex={iz('fx', 'fireRims')}>
					<FireFramesOverlay />
				</Container>
				<!-- Scatter anticipation sits above the board as a PIXI cell-rim pulse. -->
				<Container {...scatterLayout.props} zIndex={iz('fx', 'scatterAnticipation')}>
					<BoardContainer>
						<ScatterAnticipationOverlay />
					</BoardContainer>
				</Container>
				<!-- Above board/tumble so connection win text isn't covered by symbols -->
				<Container {...winsLayout.props} zIndex={iz('fx', 'connectionWins')}>
					<ConnectionWinAmounts />
				</Container>
			</MainContainer>
		</Container>

		<Container label="layer:overlay" zIndex={gz('overlay')} visible={gv('overlay')}>
			<MainContainer>
				<Container {...logoLayout.props} zIndex={iz('overlay', 'gameLogo')}>
					<GameLogo />
				</Container>
				<!-- Above reels so the well number is not covered by symbols. -->
				<Container {...plaqueLayout.props} zIndex={iz('overlay', 'waysPlaque')}>
					<WaysPlaque />
				</Container>
			</MainContainer>
		</Container>

		<Container label="layer:ui" zIndex={gz('ui')} visible={gv('ui')}>
		<UI>
			{#snippet gameName()}
				<UiGameName name="Locked In" />
			{/snippet}
			{#snippet logo()}
				<Text
					anchor={{ x: 1, y: 0 }}
					text="Opulence Gaming"
					style={{
						fontFamily: 'Outfit SemiBold',
						fontSize: providerFontSize,
						fontWeight: '700',
						lineHeight: (providerFontSize * 4) / 3,
						fill: 0xffffff,
					}}
				/>
			{/snippet}
		</UI>
		</Container>

		{#if boardSpinning}
			<Container zIndex={ABOVE_LAYERS_Z - 1}>
				<OnPressFullScreen onpress={skipBoardSpin} />
			</Container>
			<OnHotkey hotkey="Space" onpress={skipBoardSpin} />
		{/if}

		<!-- Overlays above UI (and every layer group) so tap-to-continue receives clicks -->
		<Container zIndex={ABOVE_LAYERS_Z}>
			<Win />
			<BonusIntro />
			<FreeSpinOutro />
		</Container>
	{/if}
	<!-- layout-editor: dev-only overlay, last child of <App> (dropped from production builds) -->
	{#if import.meta.env.DEV}
		<Container
			label="design-frame"
			x={builderFrame.x}
			y={builderFrame.y}
			scale={builderFrame.scale}
			pivot={anchorToPivot({
				anchor: builderFrame.anchor,
				sizes: { width: builderFrame.width, height: builderFrame.height },
			})}
		>
			<!-- empty on purpose: pixi-svelte Container always renders its children snippet -->
			{#if false}{/if}
		</Container>
	{/if}
	<LayoutEditorMount />
</App>

<!-- layout-editor: dev-only builder shell, outside the PIXI tree -->
<BuilderShellMount />

{#if dev}
	{#await import('../dev/DevPanel.svelte') then { default: DevPanel }}
		<DevPanel />
	{/await}
{/if}

<Modals>
	{#snippet version()}
		<GameVersion version="0.1.0" />
	{/snippet}
</Modals>

<MaxWinPopup />
<ReplayOverlay />
