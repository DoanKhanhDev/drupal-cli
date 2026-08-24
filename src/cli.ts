#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { runPhpcs } from './commands/phpcs';
import { runDrupalCheck } from './commands/drupalCheck';
import { runInit } from './commands/init';
import { program } from 'commander';

function resolveBinary(name: string, forceGlobal = false): string | null {
  // If forceGlobal, only look on PATH
  if (!forceGlobal) {
    const local = path.resolve(process.cwd(), 'vendor', 'bin', name);
    if (fs.existsSync(local)) return local;
  }

  // Check PATH using `which`
  const which = spawnSync('which', [name], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout) {
    return which.stdout.toString().trim();
  }

  // If forceGlobal and which didn't find it, probe common Composer global bin locations
  if (forceGlobal) {
    const candidates: string[] = [];
    const home = process.env.HOME || '';
    // Composer home may be set in COMPOSER_HOME
    const composerHome = process.env.COMPOSER_HOME || path.join(home, '.composer');
    candidates.push(path.join(composerHome, 'vendor', 'bin', name));
    // XDG config location
    const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
    candidates.push(path.join(xdg, 'composer', 'vendor', 'bin', name));
    // common system locations
    candidates.push(path.join('/usr', 'local', 'bin', name));
    candidates.push(path.join('/usr', 'bin', name));

    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }

  return null;
}

function run(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  return r.status === 0;
}

function usage(): void {
  console.log('Usage: drupal-cli [-g|--global] [phpcs|drupal-check|all|init] [paths...]');
}

program
  .name('drupal-cli')
  .option('-g, --global', 'use global binaries or perform global install')
  .option('--via <runner>', 'run init via ddev|lando|composer', 'composer')
  .allowUnknownOption(false)
  .argument('[command]', 'command to run')
  .argument('[paths...]', 'paths for the command');

async function main() {
  program.parse(process.argv);
  const opts = program.opts();
  const useGlobal = !!opts.global;
  const via = (opts.via || 'composer') as string;
  const argv = program.args as string[];
  const cmd = argv[0] || 'all';
  const paths = argv.slice(1);

  const phpcsBin = resolveBinary('phpcs', useGlobal);
  const drupalCheckBin = resolveBinary('drupal-check', useGlobal);

function showMissing(tool: string) {
  console.error(`Error: required tool '${tool}' was not found.`);
  console.error(`Install locally in your project: composer require --dev squizlabs/php_codesniffer drupal/coder mglaman/drupal-check`);
  console.error(`Or install '${tool}' globally and ensure it's on your PATH.`);
}

  // Validate tools availability for requested command
  if (cmd === 'phpcs' && !phpcsBin) {
    showMissing('phpcs');
    process.exit(127);
  }
  if (cmd === 'drupal-check' && !drupalCheckBin) {
    showMissing('drupal-check');
    process.exit(127);
  }
  if (cmd === 'all') {
    if (!phpcsBin) {
      showMissing('phpcs');
      process.exit(127);
    }
    if (!drupalCheckBin) {
      showMissing('drupal-check');
      process.exit(127);
    }
  }

  let ok = true;

  switch (cmd) {
    case 'phpcs':
      ok = runPhpcs(phpcsBin!, paths.length ? paths : ['.']);
      break;
    case 'init':
      ok = await runInit(useGlobal, true, false, via);
      break;
    case 'drupal-check':
      ok = runDrupalCheck(drupalCheckBin!, paths.length ? paths : ['.']);
      break;
    case 'all':
      ok = runPhpcs(phpcsBin!, paths.length ? paths : ['.']);
      if (ok)
        ok = runDrupalCheck(drupalCheckBin!, paths.length ? paths : ['.']);
      break;
    case 'help':
    case '-h':
    case '--help':
      usage();
      process.exit(0);
    default:
      console.error('Unknown command:', cmd);
      usage();
      process.exit(2);
  }

  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
