// This file will read from state-shared and forward events to eventEmitter
// Used primarily in Step 6

export const initSdkBridge = () => {
    // TODO: Wire state replacements
    // balance = stateBet.balanceAmount
    // bet = stateBet.betAmount
    // win = live win state
    // isIdle = stateXstateDerived.isIdle()
    // turboEnabled = stateUi.turbo
    // betAmounts = stateBet.betAmounts
    // betModes = stateBet.betModes
    // freeSpinsLeft = stateUi.freeSpinCounterShow

    // TODO: Wire event callbacks
    // onSpin -> eventEmitter.broadcast({ type: 'bet' })
    // onAutoplayStart -> eventEmitter.broadcast({ type: 'autoBet' })
    // onTurboToggle -> stateUi.turbo = !stateUi.turbo
    // onBuyBonusConfirm -> stateBet.activeBetModeKey = modeKey
    console.log('SDK Bridge initialised');
};
