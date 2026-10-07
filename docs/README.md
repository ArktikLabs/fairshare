# FairShare docs

| Doc | Read it to learn |
| --- | --- |
| [STATUS](./STATUS.md) | What works, what was verified and how, and what is still open |
| [ARCHITECTURE](./ARCHITECTURE.md) | Code layout, data model, money math, auth, permissions, notifications, cron |
| [API](./API.md) | Every HTTP endpoint, with its auth and request body |
| [OPERATIONS](./OPERATIONS.md) | Environment variables, deploy, backups, cron and the outbox in production |
| [TESTING](./TESTING.md) | Unit tests, the API smoke test and the Playwright browser flows |
| [design-system](./design-system/README.md) | UI components, colours, words for money, layout rules |
| [screenshots](./screenshots/) | The final run at 1280 px and 390 px (2026-10-08) |
| [RFC_EXPENSE_GROUP_SYSTEM](./RFC_EXPENSE_GROUP_SYSTEM.md) | The original design proposal. It is historical, so check STATUS for what was actually built. |

Each page is meant to describe the code as it is. When a doc and the code disagree, the
code is right, so update the doc in the same change.
