/**
 * sdkBridge.ts
 *
 * This is the single connection point between new-ui and the game's SDK.
 * When the game mounts new-ui, it calls sdkBridge.init(eventEmitter) to
 * provide the event emitter. All UI-triggered game events go through here.
 *
 * Step 6 completion: replace no-op stubs below with real eventEmitter calls
 * once the game passes its eventEmitter via init().
 */

import type { EmitterEventBase } from 'utils-event-emitter';

type SpinEvent = { type: 'bet' };
type AutoBetEvent = { type: 'autoBet'; counter: number };
type SdkEvent = SpinEvent | AutoBetEvent | EmitterEventBase;

let broadcast: ((event: SdkEvent) => void) | null = null;

export const sdkBridge = {
    /**
     * Called by the game at mount time to hook up the event emitter.
     */
    init(emitter: { broadcast: (event: SdkEvent) => void }) {
        broadcast = emitter.broadcast.bind(emitter);
    },

    /**
     * Triggered when the player presses Spin.
     * → eventEmitter.broadcast({ type: 'bet' })
     */
    onSpin() {
        if (broadcast) {
            broadcast({ type: 'bet' });
        } else {
            // Dev stub: log until the game wires up the emitter
            console.log('[sdkBridge] onSpin — no emitter wired yet');
        }
    },

    /**
     * Triggered when autoplay starts with a round count.
     * → eventEmitter.broadcast({ type: 'autoBet', counter })
     */
    onAutoplayStart(counter: number) {
        if (broadcast) {
            broadcast({ type: 'autoBet', counter });
        } else {
            console.log('[sdkBridge] onAutoplayStart', counter, '— no emitter wired yet');
        }
    },
};
