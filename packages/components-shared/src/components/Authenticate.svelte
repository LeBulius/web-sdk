<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import { stateUrlDerived, stateBet, stateBetDerived, stateConfig, stateModal, stateUi } from 'state-shared';
	import { API_AMOUNT_MULTIPLIER, MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);

	const authenticate = async () => {
		// Storybook / local preview has no RGS session.
		if (!stateUrlDerived.rgsUrl()) {
			return;
		}

		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				const apiBetLevels = authenticateData.config?.betLevels || [];
				stateConfig.betAmountOptions = apiBetLevels.map(
					(level) => level / API_AMOUNT_MULTIPLIER,
				);
				stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);

				// Hardcoded betAmount=1 is invalid for many currencies (e.g. JPY min 10).
				// Resolve in API integer units so float display amounts don't miss the ladder.
				const defaultApiLevel = authenticateData.config?.defaultBetLevel;
				const currentApiLevel = Math.round(stateBet.betAmount * API_AMOUNT_MULTIPLIER);
				const resolvedApiLevel =
					(defaultApiLevel != null &&
						apiBetLevels.includes(defaultApiLevel) &&
						defaultApiLevel) ||
					(apiBetLevels.includes(currentApiLevel) && currentApiLevel) ||
					apiBetLevels[0] ||
					defaultApiLevel ||
					currentApiLevel;
				const resolvedBet = resolvedApiLevel / API_AMOUNT_MULTIPLIER;
				stateBet.betAmount = resolvedBet;
				stateBet.wageredBetAmount = resolvedBet;
			}

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round 
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if(authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume =  authenticateData.round;
				}

				if(authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				};
			}
		} catch (error) {
			console.error(error);
			stateModal.modal = { name: 'error', error };
		}
	};

	const normalizeReplayState = (state: unknown): unknown[] => {
		if (Array.isArray(state)) return state;
		if (state && typeof state === 'object') {
			const record = state as Record<string, unknown>;
			if (Array.isArray(record.state)) return record.state;
			if (Array.isArray(record.events)) return record.events;
			if (Array.isArray(record.bookEvents)) return record.bookEvents;
		}
		return [];
	};

	const handleReplay = async () => {
		const social = stateUrlDerived.social();
		stateBet.currency = stateUrlDerived.currency() || (social ? 'XSC' : 'USD');

		const rawAmount = stateUrlDerived.amount();
		const betAmount = rawAmount > 0 ? rawAmount / API_AMOUNT_MULTIPLIER : 1;
		stateBet.betAmount = betAmount;
		stateBet.wageredBetAmount = betAmount;
		stateBet.activeBetModeKey = stateUrlDerived.mode() || 'BASE';

		try {
			const data = (await requestReplay({
				rgsUrl: stateUrlDerived.rgsUrl(),
				game: stateUrlDerived.game(),
				mode: stateUrlDerived.mode(),
				version: stateUrlDerived.version(),
				event: stateUrlDerived.event(),
			})) as {
				error?: unknown;
				payoutMultiplier?: number;
				costMultiplier?: number;
				state?: unknown;
			};

			if (data?.error) throw data;

			const replayState = normalizeReplayState(data?.state);
			if (replayState.length === 0) {
				throw {
					error: 'Empty replay state',
					message: JSON.stringify({ data }),
				};
			}

			const fromApi =
				typeof data?.costMultiplier === 'number' ? data.costMultiplier : undefined;
			const fromMeta = stateBetDerived.activeBetMode()?.costMultiplier;
			const costMultiplier = fromApi ?? fromMeta ?? 1;
			stateBet.replayCostMultiplier = costMultiplier;

			const replayBet = {
				payoutMultiplier: data?.payoutMultiplier ?? 0,
				costMultiplier,
				state: replayState,
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			};

			// Keep a copy for Play Again; betToResume is consumed on the first resume.
			stateBet.replayBet = JSON.parse(JSON.stringify(replayBet));
			stateBet.betToResume = JSON.parse(JSON.stringify(replayBet));
		} catch (error) {
			console.error(error);
			stateModal.modal = {
				name: 'error',
				error: {
					error: 'REPLAY_FAILED',
					message: 'Replay data could not be loaded.',
				},
			};
		}
	};

	onMount(async () => {
		if(stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			await handleReplay();
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		};

		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
