import { spawnSync } from 'child_process';

export function runPhpcs(bin: string, paths: string[]): boolean {
  const args = ['--standard=Drupal,DrupalPractice', '--extensions=php,module,inc,install,profile,theme,yml,test', '--severity=1', ...(paths.length ? paths : ['.'])];
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  return r.status === 0;
}
