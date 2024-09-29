# BAHIS-desk

## Local Development - Setup

### Linux

We need node v18 - the latest LTS. On linux a convenient way is to use Node Version Manager (https://github.com/nvm-sh/nvm)

```bash
nvm install lts/hydrogen
nvm use lts/hydrogen
```

Next, in your shell, change directory to the bahis-desk project and run:

```bash
npm install
npm run dev
```

### Windows

On Windows install node direct from their website, or by clicking [here](https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi).

Please tick to install all additional tools with "chocolatey" that should cover all of the other requirements (visual studio, python etc.)

## Helpful tricks

### How to format code locally

Just run `npm run format`

### How to lint your code to find potential issues

Just run `npm run lint-electron` for the electron code and `npm run lint-react` for the react code.

### core dumped and loads of go errors

Scroll up - do you see "fatal error: all goroutines are asleep - deadlock!". If so, I think you are using the wrong version of node. Try running:

```bash
node --version
```

And then select the correct version with `nvm` or whatever you're using.

### better-sqlite error

If you get an error like this (note: version numbers may vary):

```bash
Uncaught Error: The module './node_modules/better-sqlite3/build/Release/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 64. This version of Node.js requires
NODE_MODULE_VERSION 69. Please try re-compiling or re-installing
```

First, check you are using the correct version of node:

```bash
node --version
```

Then, if you are, run:

```bash
npm run fix-better-sqlite-build-error
```

### clearing the local datatabase

In order to reset the database before the next build you need to remove the bahis files, e.g. on linux:

```bash
rm -rf ~/.config/bahis
```

The exact location of your database will be in the electron-debug.log file and / or printed to your console.

### too many watchers

There is some leak in UI code that might give an error saying that there are too many watchers. Try this

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

(https://stackoverflow.com/questions/55763428/react-native-error-enospc-system-limit-for-number-of-file-watchers-reached)

## Building the app for distribution

### For Windows

```bash
npm run build
```

## Configuration

We have three `.env` files:

-   `.env` - for local development
-   `.env.staging` - for staging builds
-   `.env.production` - for production builds

Note that all variables in `.env` files should follow the naming format of: `VITE_[SCOPE]_[REALLY_USEFUL_NAME]`, where `SCOPE` is on of [`BAHIS`, `ELECTRON`, `REACT`] depending on whether it defines how the system interacts with the BAHIS server, the electron main process, or the react renderer process.
Once variables are read into the code they can loose the `VITE_` prefix, e.g. `VITE_BAHIS2_SERVER_URL` becomes `BAHIS2_SERVER_URL`.

### Locally overriding environment variables

If you have a `.env.local` file, this will be used instead of `.env` for local development, e.g. your `.env.local` if you are testing local server changes might look like this:

```bash
VITE_BAHIS2_SERVER_URL=http://localhost
```

### Adding new environment variables

Note that adding environment variables is a multistep process and depends on what you're trying to acheive.

#### Scenario 1 - environment variables that depend only on the build mode

If you're trying to set an environment variable that depends only on the build mode (`development` / `staging` / `production`), e.g. `BAHIS2_SERVER_URL` might be `http://localhost` in `development` and `http://www.bahis2-dev.net` in `staging` and if you are accessing this variable in the electron main process (probably the most common scenario), you can hard code this into the switch statement near the top of [`/electron/main.ts`](./electron/main.ts). For example:

```typescript
// default environment variables, i.e. for local development
let BAHIS2_SERVER_URL = 'http://www.bahis2-dev.net';

// set environment variables based on mode
switch (import.meta.env.MODE) {
    case 'development':
        break;
    case 'staging':
        BAHIS2_SERVER_URL = 'http://www.bahis2-dev.net';
        break;
    default:
        break;
}
```

If you also want to enable the ability to override this variable from a `.env` file or local shell environment, you can add the following code below the switch statement:

```typescript
// overwrite anything defined in a .env file
if (import.meta.env.VITE_BAHIS2_SERVER_URL) {
    BAHIS2_SERVER_URL = import.meta.env.VITE_BAHIS2_SERVER_URL;
    log.warn(`Overwriting BAHIS2_SERVER_URL base on environment variables or .env[.local] file.`);
}
```

#### Scenario 2 - environment variables that vary based on the server or user, e.g. secret keys or URLs that change between deployments

Store these inside an appropriate `.env` file:

-   if it's not-so-secret, i.e. a URL, add it to `.env` (and if it changes then `.env.staging` and / or `.env.production`).
-   if it's a secret, i.e. a key or password, add it to `.env.local` and document it in the `README.md` file.
