declare module './check.mjs' {
	export function checkBindings(input: {
		builder?: unknown;
		catalogue?: unknown;
		rounds?: unknown;
	}):
		| { available: false; reason: 'not available' }
		| {
				available: true;
				issues: { level: 'error' | 'warning' | 'ok'; code: string; message: string }[];
		  };
}
