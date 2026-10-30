export type BetModeData = {
    modeKey: string;
    costMultiplier: number;
    name: string;
};

export type SlotControlsProps = {
    // Labels
    balance: number;
    bet: number;
    win?: number | null;
    freeSpinsLeft?: number | null;

    // Game state flags
    isIdle?: boolean;
    isAutoplayRunning?: boolean;
    autoplaySpinsRemaining?: number | null;
    turboEnabled?: boolean;

    // Configuration
    betAmounts: number[];
    betModes?: BetModeData[];

    // Modal visibility (controlled by parent)
    isSettingsOpen?: boolean;
    isAutoplayOpen?: boolean;
    isBetMenuOpen?: boolean;

    // Legacy/Extra UI state flags
    showBonusButton?: boolean;
    extraChanceActive?: boolean;
    extraChanceCost?: number;
    showAutoplayPlay?: boolean;
    selectedAutoplay?: number | null;
};

export type SlotControlsEvents = {
    onSpin: () => void;
    onBetIncrease: () => void;
    onBetDecrease: () => void;
    onBetSelect: (amount: number) => void;
    onAutoplayStart?: (rounds: number | null, stopConditions?: any) => void;
    onAutoplayStop?: () => void;
    onTurboToggle?: () => void;
    onOpenFeatures: () => void;
    onBuyBonus?: (modeKey: string) => void;
    onBuyBonusConfirm?: (modeKey: string) => void;
    onToggleSettings: () => void;
    onToggleAutoplay: () => void;
    onToggleBetMenu: () => void;

    // Legacy/Extra UI events
    onOpenInfo: () => void;
    onSelectAutoplay?: (rounds: number | null) => void;
    onDisableExtraChance?: () => void;
};
