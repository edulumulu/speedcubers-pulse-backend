import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.test before anything else
const envPath = resolve(process.cwd(), '.env.test');
const lines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...rest] = trimmed.split('=');
  if (key && !process.env[key]) {
    process.env[key] = rest.join('=');
  }
}
