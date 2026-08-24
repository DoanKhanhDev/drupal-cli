import { spawnSync } from 'child_process';

export function runDrupalCheck(bin: string, paths: string[]): boolean {
  const args = [...(paths.length ? paths : ['.'])];
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  return r.status === 0;
}
