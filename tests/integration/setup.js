import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// In CI, env vars are injected directly — .env.test only needed locally
const envPath = resolve(process.cwd(), '.env.test');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = rest.join('=');
    }
  }
}

