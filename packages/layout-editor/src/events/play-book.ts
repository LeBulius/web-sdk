/**
 * Book-event hook. Game handlers stay as they are. This is a side channel
 * that announces each event's name, index, and payload.
 *
 * Delivery:
 * - fire-and-forget (default). announceBookEvent and playBookEvents do not
 *   wait for bindings. A binding that returns a promise keeps running.
 * - await. playBookEvents waits for every binding before the next event.
 * - A binding with `await: true` is waited for even in the default mode,
 *   because that binding has to finish (a mood crossfade, a gate).
 *
 * Win gate (H5): bindings on winInfo / setWin run only when the cash field
 * is greater than 0. These books put that cash on winInfo.totalWin and
 * setWin.amount. `win` is used when a book actually sends it.
 */
export type BookEvent = {
	type: string;
	index: number;
	[key: string]: unknown;
};

export type BookAnnouncement = {
	name: string;
	index: number;
	payload: BookEvent;
};

export type DeliveryMode = 'fire-and-forget' | 'await';

type Listener = (announcement: BookAnnouncement) => void;
type BindingFn = (event: BookEvent) => void | Promise<void>;

export type BookBinding = {
	event: string;
	fn: BindingFn;
	/** Wait for this binding even when delivery is fire-and-forget. */
	await?: boolean;
	/** winInfo / setWin bindings. Ignored when the cash field is not > 0. */
	win?: boolean;
};

const listeners = new Set<Listener>();
const bindings: BookBinding[] = [];

export function onBookEvent(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function bindBookEvent(binding: BookBinding): () => void {
	bindings.push(binding);
	return () => {
		const index = bindings.indexOf(binding);
		if (index >= 0) bindings.splice(index, 1);
	};
}

export function clearBookBindings(): void {
	bindings.length = 0;
	listeners.clear();
}

/** Cash field for the win gate. null means this event is not win-gated. */
export function winCash(event: BookEvent): number | null {
	if (event.type === 'winInfo') {
		if (typeof event.win === 'number') return event.win;
		if (typeof event.totalWin === 'number') return event.totalWin;
		return 0;
	}
	if (event.type === 'setWin') {
		if (typeof event.win === 'number') return event.win;
		if (typeof event.amount === 'number') return event.amount;
		return 0;
	}
	return null;
}

export function winBindingAllowed(event: BookEvent): boolean {
	const cash = winCash(event);
	if (cash === null) return true;
	return cash > 0;
}

export function announceBookEvent(event: BookEvent): void {
	const announcement: BookAnnouncement = { name: event.type, index: event.index, payload: event };
	for (const listener of listeners) {
		try {
			listener(announcement);
		} catch (error) {
			console.error('[layout-editor] book event listener failed', error);
		}
	}
}

function runBindings(event: BookEvent, delivery: DeliveryMode): Promise<void>[] {
	const waiting: Promise<void>[] = [];
	for (const binding of bindings) {
		if (binding.event !== event.type) continue;
		if (binding.win && !winBindingAllowed(event)) continue;
		let result: void | Promise<void>;
		try {
			result = binding.fn(event);
		} catch (error) {
			console.error('[layout-editor] book binding failed', error);
			continue;
		}
		if (result && typeof (result as Promise<void>).then === 'function') {
			const promise = result as Promise<void>;
			if (delivery === 'await' || binding.await) waiting.push(promise);
		}
	}
	return waiting;
}

/** Always announces. Awaits only the bindings that must finish. */
export async function playBookEvent(event: BookEvent, delivery: DeliveryMode = 'fire-and-forget'): Promise<void> {
	announceBookEvent(event);
	const waiting = runBindings(event, delivery);
	if (waiting.length) await Promise.all(waiting);
}

export async function playBookEvents(events: BookEvent[], delivery: DeliveryMode = 'fire-and-forget'): Promise<void> {
	for (const event of events) await playBookEvent(event, delivery);
}

/** Mood key for a book mode. degen_spin uses the degen background. */
export function moodForMode(mode: string): string {
	if (mode === 'degen_spin') return 'degen';
	if (mode === 'bonus') return '3s';
	if (mode === 'bonus_super') return '4s';
	if (mode === 'bonus_mystery') return '5s';
	return 'base';
}
