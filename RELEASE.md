# Release process

This document describes how code in this repository becomes a release of the mobile
app: the CI/CD phases, when each one runs, what each produces, and how maintainers cut
a release. It follows the process of `inatrace-backend` and `inatrace-frontend`, with
the differences a store-distributed app imposes.

Store submission is out of scope of the workflows: they test, tag and start the builds;
a maintainer submits a tested build to Google Play and App Store Connect.

## Summary

| Phase | Trigger | Runs | Produces |
|---|---|---|---|
| 1. Verify | Pull request to `main` | Lint, type check, unit tests | Nothing |
| 2. Main | Merge to `main` | The same checks | Nothing |
| 3. Prepare release | Manual (maintainer picks the version) | The checks; an Android preview build on EAS, where configured | Draft GitHub Release |
| 4. Publish | Maintainer publishes the draft | Validation; the production builds on EAS, where configured | Git tag, builds to submit |

Only phase 4 creates git tags.

## Workflows

These are the workflows in the repository's Actions tab, in `.github/workflows/`. Only
one is run by hand.

| Workflow | File | Runs | What it does |
|---|---|---|---|
| **CI** | `ci.yml` | On every pull request and every merge to `main` | Phases 1 and 2: lint, type check, unit tests |
| **Release: prepare (manual)** | `release.yml` | By a maintainer, with the version | Phase 3: the checks, the preview build, a draft GitHub Release |
| **Release: publish (on draft published)** | `publish.yml` | When a maintainer publishes the draft | Phase 4: validates the tag, starts the production builds, links them from the release |
| **Reusable: test** | `_test.yml` | Only from the workflows above | Runs the release script tests, `npm run lint`, `npm run typecheck` and `npm run test:ci` |

Runs are titled after the release they belong to, such as *Prepare release 1.21.0* and
*Publish v1.21.0*.

## Versioning

- Releases follow [Semantic Versioning](https://semver.org) with git tags `vX.Y.Z`.
  Only tags of this form are considered; anything else is ignored.
- Pre-releases use `vX.Y.Z-rc.N` and are published as GitHub pre-releases.
- **The app version is committed**, in `package.json` and `app.config.js`, because Expo
  and the stores read it from the code. Unlike the image repositories, a release starts
  with a pull request that bumps both to `X.Y.Z`. The release workflow refuses a version
  whose `X.Y.Z` is not the committed one.
- The stores accept `X.Y.Z` only, so a release candidate `X.Y.Z-rc.N` ships the committed
  `X.Y.Z`; what tells the builds apart is the build number (`versionCode`,
  `CFBundleVersion`), which EAS increments on every production build
  (`appVersionSource: remote`, `autoIncrement` in `eas.json`). A candidate goes to
  testers through internal distribution or TestFlight; the final goes to the stores.
- Releasing never commits to `main`. All changes to `main` go through pull requests.

## Builds

Phases 3 and 4 start builds on [EAS Build](https://docs.expo.dev/build/introduction/)
when the repository has an `EXPO_TOKEN` secret (an Expo access token of an account with
access to the project in `app.config.js`). Without it the phases still run: the draft
and the tag are created, and the run's summary says to build by hand.

| Phase | Profile (`eas.json`) | Platforms | For |
|---|---|---|---|
| 3. Prepare | `preview` (internal distribution) | Android | Testers, from the draft's link |
| 4. Publish | `production` (store builds, build number incremented) | Android and iOS | Submission to the stores, by a maintainer |

The workflows do not wait for the builds; their pages on expo.dev are linked from the
release notes. Signing credentials live in EAS, not in this repository. The Codemagic
`ios-testflight` workflow (`codemagic.yaml`, see `README.md`) remains an independent way to
build and upload the iOS app; it is not driven by these phases.

## Phases

### 1. Verify (pull request)

Runs on every pull request to `main`. It is a required check for merging: the release
script tests, `npm run lint`, `npm run typecheck` and `npm run test:ci`.

### 2. Main (merge)

Runs the same checks on every push to `main`, which in practice means every merged pull
request, because the merged result can differ from what the pull request tested if
`main` moved in the meantime.

### 3. Prepare release (manual)

Started by a maintainer, with the version as input.

1. The version is validated:
   - it is valid semver, either `X.Y.Z` or `X.Y.Z-rc.N`;
   - the tag `vX.Y.Z…` does not exist yet;
   - it is higher than every published release in the same `X.Y` line;
   - its `X.Y.Z` is the version in `package.json`.
2. The current `main` commit is pinned; everything below uses that commit.
3. The checks run.
4. With an `EXPO_TOKEN`, an Android preview build of the commit is started on EAS.
5. A **draft** GitHub Release `v<version>` is created, targeting the pinned commit, with
   generated release notes and the preview build's link above them. Notes for a final
   release start from the previous final release, so that its release candidates do not
   hide the changes. Versions with `-rc.N` are marked as pre-release.

Nothing is public yet. The git tag does not exist until the draft is published.

### 4. Publish (draft published)

Runs when a maintainer publishes the draft (`release: published`). GitHub creates the
tag `v<version>` at that moment.

1. The version is validated again: the tag's form, its place in the `X.Y` line, the
   pre-release flag, and that the tagged commit's `package.json` carries its `X.Y.Z`.
2. With an `EXPO_TOKEN`, the production builds of the tagged commit are started on EAS,
   for Android and iOS, and linked from the release notes.
3. A maintainer tests the builds and submits them to the stores (`eas submit`, or the
   store consoles). The workflow does not submit.

A tag created by hand or a release not created by phase 3 is validated the same way; the
difference is only that no tested draft preceded it, so don't.

## Cutting a release

> **Always start from the *Release: prepare (manual)* workflow.** Do not create releases
> or `v*` tags by hand. Edit and publish only the drafts the workflow creates.

### Pre-release (release candidate)

0. If `package.json` and `app.config.js` are not at the version to release, bump them in
   a pull request first (`chore(mobile): bump the app version to 1.21.0`).
1. Start the release workflow:
   - **UI:** Actions → *Release: prepare (manual)* → *Run workflow* → `version: 1.21.0-rc.1`
   - **CLI:** `gh workflow run release.yml -R agstack/inatrace-mobile -f version=1.21.0-rc.1`
2. When it finishes, review the draft:
   - **UI:** Releases → `v1.21.0-rc.1` → *Edit*
   - **CLI:** `gh release view v1.21.0-rc.1 -R agstack/inatrace-mobile`
3. Publish it:
   - **UI:** *Publish release*
   - **CLI:** `gh release edit v1.21.0-rc.1 -R agstack/inatrace-mobile --draft=false --prerelease`
4. Test the builds linked from the release; give the candidate to testers through internal
   distribution or TestFlight.

### Final release

Same steps with `version: 1.21.0`, from the same commit as the approved release
candidate. Then submit the production builds to the stores.

### Discarding a draft

Delete the draft (Releases → draft → *Delete*, or `gh release delete v<version>`). No
tag is created. A build already started on EAS is simply not submitted.

## Rationale

- **Version committed, chosen before the release.** The image repositories choose the
  version when cutting the release and embed it at build time. Expo reads the version
  from `app.config.js` on the build server, and the stores show it to users, so here it
  is committed first and the workflow verifies that the release matches it.
- **Release candidates share the final's version string.** Apple rejects a version
  such as `3.0.0-rc.1`; Google tolerates it in `versionName` but it would reach users.
  The git tag carries the `-rc.N`, the build number tells the builds apart.
- **Draft, then publish.** Everything that can fail (checks, starting the build) happens
  before anything is public. A maintainer reviews the release notes before publishing.
- **Builds on EAS, submission by hand.** EAS holds the signing credentials and the build
  numbers. Submitting to the stores is irreversible for users on auto-update, so it stays
  a deliberate step after testing the exact build.

## Repository setup (one time)

- Actions may create and edit releases. Workflows request only the permissions they
  need: `contents`.
- Optional secret `EXPO_TOKEN`: an Expo access token with access to the EAS project.
  Without it no build is started and the run summary says so.
- EAS: the project (`extra.eas.projectId` in `app.config.js`), its credentials for Android
  and iOS, and the environment variables the production profile needs (`EXPO_PUBLIC_*`,
  Mapbox tokens), set up with `eas credentials` and the EAS dashboard.
- Branch protection on `main`: pull requests only, with the phase 1 check `check / Check`
  required.

## Testing CI changes in a fork

The workflows do not hard-code repository names, so a fork runs them unchanged. Validate
workflow changes end to end in a fork before opening a pull request here.
[`act`](https://github.com/nektos/act) runs the checks locally
(`act pull_request -W .github/workflows/ci.yml`); under act (`ACT=true`) the steps that
need GitHub itself, `gh release`, are only printed.

The release rules (version validation, committed app version, release notes start) live
in `.github/scripts/release.py`, tested by `python3 -m unittest discover -s .github/scripts`.

## Known gaps

- **No build is tested by the workflows.** The checks run against the code, not against
  an installed app. Testing the builds is the maintainers' step between phases 3 and 4
  and before submission.
- **iOS has no preview build in phase 3.** Internal distribution on iOS needs registered
  devices and ad hoc provisioning; TestFlight, from a production build, is the practical
  channel.
- **Store submission is manual.** `eas submit` can be added to phase 4 once the EAS
  credentials for both stores are in place and the team wants a published draft to mean
  "ship".
- **Releases are cut from `main` only.** Maintenance branches for older lines are not
  supported yet.
