# drupal-cli (Node.js)

Node.js CLI wrapper to run `phpcs` (Drupal coding standard) and `drupal-check` in Drupal projects.

Prerequisites

- PHP and Composer (if you plan to use project-local Composer binaries)
- Either have `phpcs` and `drupal-check` available in your PATH, or install them via Composer in the project `vendor/bin` directory.

Install

```bash
curl -fsSL https://raw.githubusercontent.com/DoanKhanhDev/drupal-cli/main/install.sh | bash -s -- --tag latest
```
Install for developer

```bash
# Install Node dev deps
npm install

# Build the TypeScript to `dist/`
npm run build

# Global install (installs a copy globally)
./install.sh
# or, install directly with npm
npm install -g .
```

```

Usage

- Run both checks on current directory:

```bash
drupal-cli all .
```

- Run only `phpcs`:

```bash
drupal-cli phpcs web/modules/custom
```

- Run only `drupal-check`:

```bash
drupal-cli drupal-check web/modules/custom
```

Init command

```bash
# Install tools into the current project (will prompt for confirmation)
drupal-cli init

# Install globally
drupal-cli -g init
```

To install PHP tools locally in a Drupal project:

```bash
composer require --dev squizlabs/php_codesniffer drupal/coder mglaman/drupal-check
```

Additional `init` options

Run the install via a container wrapper such as `ddev` or `lando` (useful when your environment uses those tools):

```bash
# Run init using ddev's composer wrapper
drupal-cli --via ddev init

# Run init using lando's composer wrapper
drupal-cli --via lando init

# Global via ddev
drupal-cli -g --via ddev init
```

Notes

- The CLI prefers project-local Composer binaries in `vendor/bin` before falling back to binaries on `PATH`.
- The package `bin` entry points to `dist/cli.js` (the compiled output). Ensure you run `npm run build` before global install or `npm start`.

To force use of global PATH binaries instead of `vendor/bin`, pass `-g` or `--global` anywhere on the command line:

```bash
drupal-cli -g phpcs web/modules/custom
drupal-cli phpcs -g web/modules/custom   # also supported
```

Uninstall

- To remove the global package installed via npm:

```bash
npm uninstall -g drupal-cli
```

- If you installed the package from the repository with `npm install -g .`, the command above should remove it. If the binary still exists, remove it manually:

```bash
which drupal-cli
sudo rm "$(which drupal-cli)"
```

- To list globally installed packages and verify removal:

```bash
npm ls -g --depth=0
```
