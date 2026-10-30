/** One in-process queue for every builder.json write. */
export function createWriteQueue() {
	let chain: Promise<void> = Promise.resolve();
	return function enqueue<T>(task: () => Promise<T>): Promise<T> {
		const run = chain.then(task, task);
		chain = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	};
}

export type WriteQueue = ReturnType<typeof createWriteQueue>;
