import { stateUi, stateUrlDerived } from 'state-shared';

export const isReplayUi = () => stateUi.config.mode === 'replay' || stateUrlDerived.replay();
