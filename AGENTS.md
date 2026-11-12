# AGENTS.md

Instructions for coding agents working in this repository. Humans: the same rules
apply; `README.md` and `docs/` are the place to start.

## What this is

The INATrace mobile app for Android and iOS: Expo SDK 58, React Native, TypeScript,
expo-router (screens under `app/`), NativeWind for styles. Field staff record farmers
and map plots offline; the data lives in Realm on the device and is synchronized with
the Java backend (`inatrace-backend`) when there is a connection. One app can log in to
several backend servers (`docs/multiple-servers.md`).

## Build and test

```bash
npm ci                       # also applies patches/ through patch-package
npx jest --ci                # unit tests once; `npm test` watches
npx tsc --noEmit             # type check
npx expo run:android         # native build on a device or emulator (or run:ios)
```

- Tests use `jest-expo`, under `__tests__/` and next to the code (`*.test.js`). They
  need no device, emulator or backend.
- `tsc --noEmit` reports one existing error (the `global.css` import in
  `app/_layout.tsx`); don't add others. ESLint is not usable yet: ESLint 9 does not
  read `.eslintrc.js`.
- The app reads its settings from `.env` (`EXPO_PUBLIC_*`, see `README.md`). Public
  Expo variables are compiled into the app, so they must never hold secrets. Never
  commit `.env`, signing keys, certificates or tokens.
- Run the tests you touched (or all of them) before claiming a change works, and say
  what you ran. A fix comes with a test that fails without it.

## Changing code

- Keep the style of the file you are in: comment density, naming, the helpers in
  `utils/`, `realm/` and `context/`.
- Offline data is the farmers' records on devices that may not sync for days. Realm
  files are per server and user (`realm/context.ts`); don't change how they are named
  or opened, and never delete or overwrite one to get past an error. A change to
  `realm/schemas.ts` must open the Realm files existing installs already have.
- Call the backend with `axios`. `utils/sessionRequests.ts` intercepts its requests:
  it refuses any that is not for the logged-in server and cancels them all on logout.
  Don't bypass it with `fetch` or a separate axios instance.
- Anything in `plugins/` or `app.config.js` changes the native projects: it takes a
  native rebuild, not only a JavaScript reload, and needs checking on Android and iOS.
- User-facing text goes through `locales/i18n.ts`; add the key to `en.json`, `de.json`,
  `es.json` and `rw.json` together.
- The app version is in both `package.json` and `app.config.js`; change them together.
- The app ships through the stores, so old versions stay in use for a long time. A
  change must keep working with the backend currently deployed, or the PR must say
  which backend PR it needs.

## Documentation

`README.md` and `docs/` describe running, building and the app's behaviour. Update what
a change makes wrong in the same commit. Don't write run-specific numbers (test counts,
timings) into them; they go stale on the next commit.

## Commits and pull requests

- Conventional Commits with the `mobile` scope where it applies: `<type>(mobile):
  <summary>`, lowercase, imperative, no trailing period (`fix:`, `feat:`, `test:`,
  `docs:`, `refactor:`, `chore:`, `ci:`, `build:`).
- One concern per PR. Reference the issue (`(#123)`) in the subject when there is one.
- No AI attribution: no `Co-Authored-By: Claude …` trailers, no "Generated with …" or
  "Prepared with LLM assistance" in commits, PR descriptions, issues or docs.
- Don't merge, rebase or push shared branches unless asked.
