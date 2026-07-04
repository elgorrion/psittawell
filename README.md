# PsittaWell

A **non-commercial companion app** that turns a published companion-parrot welfare assessment into a friendly, offline-first phone app: a help tool for parrot owners and the scientists and vets who support them.

Based on:

> Piseddu A, van Zeeland Y, Hemsworth L, Rault J-L (2026). PsittaWel: A welfare assessment tool for companion parrots. Animal Welfare 35, e34. DOI [10.1017/awf.2026.10089](https://doi.org/10.1017/awf.2026.10089). Original tool: <https://www.vetmeduni.ac.at/psittawel>

A KarmaNova Animal Technologies initiative. **Not monetised.** Instrument content is used with permission; public release is gated on the original authors' approval. See [`LICENSING.md`](LICENSING.md).

## Status

Private development prototype for author-approval review. Public distribution, app-store release, and any redistribution of the instrument content wait for the original authors' approval.

## What it does

- Guides a caregiver through the 75-question PsittaWel welfare assessment across 8 sections.
- Works offline with local on-device SQLite storage; no account, sign-in, analytics, ads, tracking, or data sale.
- Saves assessments, supports follow-up assessments with stable demographic details carried forward, and keeps completed assessments read-only.
- Shows feedback only after completion: a qualitative welfare overview, urgent professional-review markers, observe-more prompts, change over time, and a shareable local report.
- Deliberately provides **no cumulative score, no diagnosis, and no prescription**. Concerns should be reviewed with an avian veterinarian or certified parrot behaviour consultant.

## Principles

Faithful to the published instrument · private and offline · accessible and friendly · non-commercial · simple, not overbuilt.

## Platform

Built with Expo (React Native), TypeScript, expo-router, and on-device `expo-sqlite` storage for iOS and Android, with web as a bonus.

## Licensing

Split by design: application code is open source; the instrument content and any third-party images are used only with permission and are not open-licensed. See [`LICENSING.md`](LICENSING.md).
