import fs from 'node:fs/promises';
import path from 'node:path';

let counter = 0;

/** Unique temp file (pid + counter + random) then atomic rename. */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
	counter += 1;
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
	const tmp = path.join(
		dir,
		`.${path.basename(filePath)}.${process.pid}.${counter}.${Math.random().toString(16).slice(2)}.tmp`,
	);
	await fs.writeFile(tmp, content, 'utf8');
	await fs.rename(tmp, filePath);
}
