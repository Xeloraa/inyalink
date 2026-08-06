import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const promptsDir = path.dirname(fileURLToPath(import.meta.url));

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const filePath = path.join(promptsDir, `${name}.md`);
  const body = fs.readFileSync(filePath, 'utf8');
  cache.set(name, body);
  return body;
}

export function renderPrompt(
  name: string,
  vars: Record<string, string | number>,
): string {
  let body = loadPrompt(name);
  for (const [key, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, String(value));
  }
  return body;
}
