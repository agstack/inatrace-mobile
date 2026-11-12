# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in the INATrace mobile
app, please report it privately to **gus@manaiba.tech**.

Please do **not** open a public GitHub issue or pull request for security
problems, and do not disclose the details publicly until a fix has been
released.

### What to include

The more of the following you can provide, the faster we can confirm and fix the
issue:

* A description of the vulnerability and its potential impact.
* The affected screen, component or file (for example `realm/` or
  `utils/servers.ts`).
* The app version (from the store or the build), or the commit you built.
* The platform, OS version and device: Android or iOS.
* Steps to reproduce, ideally a minimal sequence of actions or a proof of concept.
* Any logs, network traces or screenshots that help us understand the problem.
* Whether you had to be logged in, and with which role, and whether the device
  was online or offline.

Please report in English, and let us know if you would like to be credited in
the release notes once the issue is fixed.

### What to expect

* We aim to acknowledge your report within **3 working days**.
* We will send an initial assessment, including whether we can reproduce the
  issue and how we rate its severity, within **10 working days**.
* We will keep you informed of our progress while we work on a fix, and let you
  know when it has been released.

## Supported Versions

Security fixes are applied to the latest release on the `main` branch, and reach
users through a new store release. Older versions are not patched; if you are
running an older version, please update the app before reporting.

## Scope

This policy covers the code in this repository — the INATrace mobile app for
Android and iOS, including the data it keeps on the device, how it talks to the
backend servers it is configured for, and its native modules and build
configuration.

A problem where the API returns data or accepts an action it should not is a
backend issue; report it the same way, and we will route it to the
[backend](https://github.com/agstack/inatrace-backend/blob/main/SECURITY.md).

Reports about a specific hosted INATrace deployment, or about an app published
under another organisation's store account, should go to that organisation. If
you are unsure, send the report to the address above and we will route it.

Issues in third-party dependencies should normally be reported to the upstream
project. Tell us anyway if the dependency is reachable through this app, so we
can plan an upgrade.

### Out of scope

The following are generally not treated as vulnerabilities on their own:

* Findings from automated scanners with no demonstrated impact.
* Values that are public by design, such as the `EXPO_PUBLIC_*` settings and the
  public map token compiled into every build, unless they grant more than the
  provider's settings allow.
* Attacks that need a rooted or jailbroken device, or a device already unlocked
  in the attacker's hands with the app logged in.
* Denial of service through sheer volume of traffic, and any form of testing
  that degrades a running deployment.
* Social engineering, phishing or physical attacks against users, contributors
  or operators.
* Vulnerabilities that require a fully compromised server, device or developer
  machine.

## Disclosure

We follow coordinated disclosure. Once a fix is available we will publish it,
note the issue in the release notes and, with your agreement, credit you as the
reporter. Please give us a reasonable chance to release a fix before disclosing
the details publicly.
