import type { IncomingMessage } from 'node:http';

export const DEFAULT_DEV_HOSTS = ['localhost', '127.0.0.1', '::1'] as const;

export function hostnameFromHostHeader(host: string | undefined): string | null {
	if (!host) return null;
	const trimmed = host.trim();
	if (trimmed.startsWith('[')) {
		const end = trimmed.indexOf(']');
		if (end === -1) return null;
		return trimmed.slice(1, end);
	}
	const colon = trimmed.lastIndexOf(':');
	if (colon > -1 && trimmed.indexOf(':') === colon) return trimmed.slice(0, colon);
	return trimmed;
}

export function hostnameFromOrigin(origin: string | undefined): string | null {
	if (!origin) return null;
	try {
		return new URL(origin).hostname;
	} catch {
		return null;
	}
}

/**
 * Host is required and must be on the allowlist.
 * A missing Origin is allowed (curl). A present Origin must also be allowed.
 */
export function isDevRequestAllowed(
	headers: IncomingMessage['headers'] | Record<string, string | string[] | undefined>,
	allow: readonly string[] = DEFAULT_DEV_HOSTS,
): boolean {
	const hostHeader = headerValue(headers.host ?? headers.Host);
	const host = hostnameFromHostHeader(hostHeader);
	if (!host || !allow.includes(host)) return false;
	const originHeader = headerValue(headers.origin ?? headers.Origin);
	if (!originHeader) return true;
	const originHost = hostnameFromOrigin(originHeader);
	return originHost !== null && allow.includes(originHost);
}

function headerValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0];
	return value;
}
