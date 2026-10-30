export const uiStore = $state({
    showSettings: false,
    showAutoplay: false,
    showBetMenu: false,
    showFeatures: false,
    showInfo: false,
    showPaytable: false,
    showGameRules: false,
    showError: false,
    errorTitle: '',
    errorMessage: '',

    // TEMPORARY: test values — replaced by state-shared on wiring
    balance: 1000.0,
    bet: 1.0,
    win: 0.06 as number | null,
    freeSpinsLeft: 10 as number | null,
    isIdle: true,
    isAutoplayRunning: false,
    autoplaySpinsRemaining: null as number | null,
    turboEnabled: false,

    // Additional local UI state needed for testing
    selectedAutoplay: null as number | null,
    extraChanceActive: false,
    errorType: 'insufficient-balance' as 'insufficient-balance' | 'reload',

    // Free Games test state
    isFreeGames: false,
    freeGamesTotalWin: 0,
    freeGamesTriggerBet: 1.0,

    betAmounts: [
        0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0,
        12.0, 14.0, 16.0, 18.0, 20.0, 30.0, 40.0, 50.0, 75.0, 100.0, 150.0, 200.0, 250.0
    ]
});
