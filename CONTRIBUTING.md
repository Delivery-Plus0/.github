# Contributing to Delivery Plus

Thanks for helping. Everything here is open source (MIT), and code, tests, docs, translations (Arabic and English) and design are all welcome.

## Find something to work on

- [**Good first issues**](https://github.com/Delivery-Plus0/delivery-plus/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22): small and well described.
- [**Help wanted**](https://github.com/Delivery-Plus0/delivery-plus/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22): bigger pieces where a hand is welcome.
- The [roadmap milestones](https://github.com/Delivery-Plus0/delivery-plus/milestones) show what comes next.

Comment on an issue before starting, so two people don't build the same thing. For anything touching personal data or security, post a short design in the issue first.

## How work flows

1. Fork the repository, or branch from `dev` if you have access: `feat/<short-name>` or `fix/<short-name>`.
2. Make the change, with tests. Each repository's README and `CONTRIBUTING.md` explain how to run it and its checks.
3. Open a pull request to `dev` that says what changed and how you checked it, and links the issue (`Closes #N`).
4. CI must be green: lint, tests, builds, end-to-end tests where the repository has them, and security scans. A maintainer then reviews and merges.

## Where things live

| Repository | Start here |
| --- | --- |
| [delivery-plus](https://github.com/Delivery-Plus0/delivery-plus) (backend) | [CONTRIBUTING.md](https://github.com/Delivery-Plus0/delivery-plus/blob/dev/CONTRIBUTING.md) · `docker compose` brings up the whole stack |
| [customer](https://github.com/Delivery-Plus0/delivery-plus-customer-app) · [driver](https://github.com/Delivery-Plus0/delivery-plus-driver-app) · [restaurant](https://github.com/Delivery-Plus0/delivery-plus-restaurant-app) apps | README → *Getting started* · `npm run web` |
| [delivery-plus-infra](https://github.com/Delivery-Plus0/delivery-plus-infra) | README · `make lint test` |

## Ground rules

- Be kind; see the [Code of Conduct](CODE_OF_CONDUCT.md).
- Never commit secrets, `.env` files or real personal data. The repositories are public.
- Every user-facing string goes through translation, with an Arabic entry (right to left must work).
- Business rules live in the backend's `docs/business/`. Changing one needs a maintainer's decision first.
