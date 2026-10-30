import type { IncomingMessage } from 'node:http';

import type { UploadedFile } from './atlas';

export type MultipartResult = {
	fields: Record<string, string>;
	files: UploadedFile[];
};

/** Minimal multipart/form-data parser. Dev uploads only; no nested multiparts. */
export function parseMultipart(
	body: Buffer,
	contentType: string,
): MultipartResult {
	const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
	const boundary = match?.[1] ?? match?.[2];
	if (!boundary) throw new Error('multipart boundary missing');
	const delimiter = Buffer.from(`--${boundary.trim()}`);
	const fields: Record<string, string> = {};
	const files: UploadedFile[] = [];

	let cursor = body.indexOf(delimiter);
	if (cursor === -1) throw new Error('multipart body has no boundary');
	while (cursor !== -1) {
		const after = cursor + delimiter.length;
		if (body[after] === 45 && body[after + 1] === 45) break; // --
		let start = after;
		if (body[start] === 13 && body[start + 1] === 10) start += 2;
		const headerEnd = body.indexOf('\r\n\r\n', start);
		if (headerEnd === -1) break;
		const headerText = body.subarray(start, headerEnd).toString('utf8');
		const dataStart = headerEnd + 4;
		const next = body.indexOf(delimiter, dataStart);
		if (next === -1) break;
		let dataEnd = next;
		if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) dataEnd -= 2;
		const data = body.subarray(dataStart, dataEnd);
		const disposition = /content-disposition:[^\r\n]*/i.exec(headerText)?.[0] ?? '';
		const name = /name="([^"]*)"/.exec(disposition)?.[1] ?? /name=([^;\s]+)/.exec(disposition)?.[1] ?? '';
		const filename = /filename="([^"]*)"/.exec(disposition)?.[1];
		if (filename) files.push({ filename, data: Buffer.from(data) });
		else if (name) fields[name] = data.toString('utf8');
		cursor = next;
	}
	return { fields, files };
}

export function readRawBody(req: IncomingMessage, limit: number): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > limit) {
				reject(new Error('payload too large'));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}
