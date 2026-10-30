import { uiStore } from './uiStore.svelte';

export const handleIncreaseBet = () => {
    const currentIndex = uiStore.betAmounts.indexOf(uiStore.bet);
    if (currentIndex < uiStore.betAmounts.length - 1) {
        uiStore.bet = uiStore.betAmounts[currentIndex + 1];
    }
};

export const handleDecreaseBet = () => {
    const currentIndex = uiStore.betAmounts.indexOf(uiStore.bet);
    if (currentIndex > 0) {
        uiStore.bet = uiStore.betAmounts[currentIndex - 1];
    }
};

export const handleSelectBet = (newBet: number) => {
    uiStore.bet = newBet;
    uiStore.showBetMenu = false;
};

export const handleSpin = () => {
    // If autoplay is selected but not running, start autoplay
    if (uiStore.selectedAutoplay !== null && !uiStore.isAutoplayRunning) {
        uiStore.isAutoplayRunning = true;
        uiStore.autoplaySpinsRemaining = uiStore.selectedAutoplay;
        uiStore.showAutoplay = false;
    }
    // If autoplay is running, decrement spins
    else if (uiStore.isAutoplayRunning && uiStore.autoplaySpinsRemaining !== null) {
        if (uiStore.autoplaySpinsRemaining > 1) {
            uiStore.autoplaySpinsRemaining -= 1;
        } else {
            // Autoplay finished
            uiStore.isAutoplayRunning = false;
            uiStore.autoplaySpinsRemaining = null;
            uiStore.selectedAutoplay = null;
        }
    }
    console.log('Spinning...');
};

export const handleAutoplaySelect = (rounds: number | null) => {
    uiStore.selectedAutoplay = rounds;
};

export const handleTurboToggle = () => {
    uiStore.turboEnabled = !uiStore.turboEnabled;
};

export const handleFeatureConfirmed = (featureId: number) => {
    // Feature 1 = Extra Chance (toggle on)
    if (featureId === 1) {
        uiStore.extraChanceActive = true;
    }
    // Features 2 & 3 are direct bonus buys — no persistent bar state needed
};

export const handleToggleSettings = () => {
    if (uiStore.showSettings) {
        uiStore.showSettings = false;
    } else {
        uiStore.showSettings = true;
        uiStore.showAutoplay = false;
        uiStore.showBetMenu = false;
    }
};

export const handleOpenInfo = () => {
    uiStore.showInfo = true;
    uiStore.showSettings = false;
    uiStore.showAutoplay = false;
    uiStore.showBetMenu = false;
    uiStore.showFeatures = false;
};

export const handleToggleAutoplay = () => {
    if (uiStore.showAutoplay) {
        uiStore.showAutoplay = false;
    } else {
        uiStore.showAutoplay = true;
        uiStore.showSettings = false;
        uiStore.showBetMenu = false;
    }
};

export const handleToggleBetMenu = () => {
    if (uiStore.showBetMenu) {
        uiStore.showBetMenu = false;
    } else {
        uiStore.showBetMenu = true;
        uiStore.showSettings = false;
        uiStore.showAutoplay = false;
    }
};

export const handleOpenFeatures = () => {
    uiStore.showFeatures = true;
    uiStore.showSettings = false;
    uiStore.showAutoplay = false;
    uiStore.showBetMenu = false;
    uiStore.showInfo = false;
};
