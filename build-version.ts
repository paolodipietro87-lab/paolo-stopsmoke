import { execSync } from 'node:child_process';

/**
 * Impronta della build: `<data> <hash>`, es. "2026-07-09 30e5856".
 * Su GitHub Actions il checkout ha il .git, quindi l'hash e quello reale del deploy.
 * Fuori da un repo (o senza git) resta "locale": non serve a nessuno confonderlo con un deploy.
 */
export function versioneBuild(): string {
  const data = new Date().toISOString().slice(0, 10);
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return `${data} ${hash}`;
  } catch {
    return `${data} locale`;
  }
}
