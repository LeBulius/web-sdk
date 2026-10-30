import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventBonusIntro } from '../components/BonusIntro.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventConnectionWinAmounts } from '../components/ConnectionWinAmounts.svelte';
import type { EmitterEventMaxWinPopup } from '../components/MaxWinPopup.svelte';
import type { EmitterEventExpandingWild } from '../components/ExpandingWildOverlay.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventSound
	| EmitterEventWin
	| EmitterEventBonusIntro
	| EmitterEventFreeSpinOutro
	| EmitterEventTumbleBoard
	| EmitterEventConnectionWinAmounts
	| EmitterEventMaxWinPopup
	| EmitterEventExpandingWild
	| { type: 'uiHide' }
	| { type: 'uiShow' }
	| { type: 'stopButtonEnable' }
	| { type: 'drawerButtonShow' }
	| { type: 'drawerButtonHide' }
	| { type: 'drawerFold' }
	| { type: 'drawerUnfold' }
	| { type: 'transition' }
	| { type: 'freeSpinIntroShow' }
	| { type: 'freeSpinIntroHide' }
	| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number }
	| { type: 'soundScatterCounterClear' };
