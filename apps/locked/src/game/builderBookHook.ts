/**
 * layout-editor (visual builder) book-event side channel. DEV ONLY.
 *
 * Wraps each handler of the game's own bookEventHandlerMap so that, after the game handler
 * has finished, the same event is announced to layout-editor (`playBookEvent` from
 * packages/layout-editor/src/events/play-book, imported by relative path as INTEGRATION.md
 * requires). Game handlers and their order are unchanged. utils.ts only uses this when
 * `import.meta.env.DEV` is true, so production builds keep the original map and this module
 * (and layout-editor's play-book) is tree-shaken away.
 */
type Handler = (bookEvent: any, bookEventContext: any) => unknown;

type BuilderBookEvent = { type: string; index: number; [key: string]: unknown };

const loadPlayBook = () => import('../../../../packages/layout-editor/src/events/play-book');

let announce: ((event: BuilderBookEvent) => Promise<void>) | undefined;
/** True while the game's own loop is announcing, so the preview bridge ignores those events. */
let announcingFromGame = false;

const announceToBuilder = async (bookEvent: BuilderBookEvent) => {
	if (!announce) announce = (await loadPlayBook()).playBookEvent;
	// announceBookEvent calls listeners synchronously inside playBookEvent, before its first await.
	announcingFromGame = true;
	const pending = announce(bookEvent);
	announcingFromGame = false;
	await pending;
};

/**
 * Builder Events/Preview → game. The Preview tab only announces book events; this plays each
 * announced event through the game's own (unwrapped) handler, one at a time, so a previewed
 * round animates on the real board. Events announced by the game loop itself are ignored.
 */
export function installBuilderPreviewBridge(bookEventHandlerMap: Record<string, Handler>) {
	let queue: Promise<unknown> = Promise.resolve();
	void loadPlayBook().then(({ onBookEvent }) =>
		onBookEvent(({ payload }) => {
			if (announcingFromGame) return;
			const handler = (bookEventHandlerMap as Record<string, Handler | undefined>)[payload.type];
			if (!handler) return;
			queue = queue
				.then(() => handler(payload, { bookEvents: [payload] }))
				.catch((error) => console.error('[builder preview] game handler failed', payload.type, error));
		}),
	);
}

export function withBuilderBookHook<TMap extends Record<string, Handler>>(bookEventHandlerMap: TMap): TMap {
	// Lazy (Proxy) so the game's map is only read when an event plays, never at module init
	// (bookEventHandlerMap.ts and utils.ts import each other).
	const wrapped = new Map<Handler, Handler>();
	return new Proxy(bookEventHandlerMap, {
		get(target, type, receiver) {
			const handler = Reflect.get(target, type, receiver) as Handler | undefined;
			if (typeof handler !== 'function') return handler;
			let hooked = wrapped.get(handler);
			if (!hooked) {
				hooked = async (bookEvent, bookEventContext) => {
					await handler(bookEvent, bookEventContext);
					await announceToBuilder(bookEvent);
				};
				wrapped.set(handler, hooked);
			}
			return hooked;
		},
	});
}
