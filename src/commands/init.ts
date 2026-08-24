import { spawnSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

export async function runInit(globalInstall = false, confirm = true, _skipScripts = false, via = 'composer'): Promise<boolean> {
  const pkgs = ['squizlabs/php_codesniffer', 'drupal/coder', 'mglaman/drupal-check'];
  const args = globalInstall ? ['global', 'require', ...pkgs] : ['require', '--dev', ...pkgs];

  if (confirm) {
    const ans = await ask(`${globalInstall ? 'Global' : 'Local'} install will run: ${via} ${args.join(' ')}. Continue? [y/N] `);
    if (!/^y(es)?$/i.test(ans.trim())) {
      console.log('Aborted by user.');
      return false;
    }
  }

  console.log(`${globalInstall ? 'Global' : 'Local'} install: ${via} ${args.join(' ')}`);

  const buildRunner = (viaRunner: string, commandArgs: string[]) => {
    if (viaRunner === 'ddev' || viaRunner === 'lando') {
      return { cmd: viaRunner, args: ['composer', ...commandArgs] };
    }
    return { cmd: 'composer', args: commandArgs };
  };

  const runner = buildRunner(via, args);
  // Always enable composer plugins via config before running require
  const cfgCmd = runner.cmd;
  const cfgArgs = (runner.cmd === 'ddev' || runner.cmd === 'lando')
    ? ['composer', 'config', ...(globalInstall ? ['--global'] : []), 'allow-plugins', 'true']
    : ['config', ...(globalInstall ? ['--global'] : []), 'allow-plugins', 'true'];
  console.log(`Configuring composer allow-plugins: ${cfgCmd} ${cfgArgs.join(' ')}`);
  const cfg = spawnSync(cfgCmd, cfgArgs, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
  if (cfg.status !== 0) {
    if (cfg.stdout) process.stdout.write(cfg.stdout);
    if (cfg.stderr) process.stderr.write(cfg.stderr);
    console.warn('Warning: failed to set composer allow-plugins automatically. You may need to run the above command manually.');
  }
  const run = (cmd: string, a: string[]) => spawnSync(cmd, a, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
  let r = run(runner.cmd, runner.args);
  if (r.status !== 0) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    return false;
  }

  if (globalInstall) {
    // Try to configure phpcs installed_paths to the Composer global drupal/coder location
    const home = process.env.HOME || '';
    const composerHome = process.env.COMPOSER_HOME || path.join(home, '.composer');
    const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
    const candidates = [
      path.join(composerHome, 'vendor', 'drupal', 'coder', 'coder_sniffer'),
      path.join(xdg, 'composer', 'vendor', 'drupal', 'coder', 'coder_sniffer'),
    ];

    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        console.log(`phpcs: configuring installed_paths -> ${c}`);
        if (via === 'composer') {
          const cfg = spawnSync('phpcs', ['--config-set', 'installed_paths', c], { stdio: 'inherit' });
          if (cfg.status === 0) { break; }
        }
        else {
          console.log(`Note: run inside your ${via} environment to configure phpcs installed_paths:`);
          console.log(`  ${via} composer run -- phpcs --config-set installed_paths ${c}`);
          break;
        }
      }
    }
    console.log('\x1b[32mGlobal install complete.\x1b[0m');
  } else {
    console.log('\x1b[32mLocal install complete.\x1b[0m');
  }

  return true;
}

