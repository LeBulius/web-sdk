import { createEventEmitter } from 'utils-event-emitter';
import type { EmitterEventHotKey } from 'components-shared';
import type { EmitterEventUi } from 'new-ui-pixi';
import type { EmitterEventModal } from 'new-ui-html';

import type { EmitterEventGame } from './typesEmitterEvent';

export type EmitterEvent =
	| EmitterEventHotKey
	| EmitterEventUi
	| EmitterEventModal
	| EmitterEventGame;

export const { eventEmitter } = createEventEmitter<EmitterEvent>();
