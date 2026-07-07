# Contributing

`main` is protected — **no direct pushes**. Every change goes through a Pull Request.

## Workflow

1. Create a new branch off `main`.
2. Commit your work with clear messages.
3. Push the branch and open a PR against `main`.
4. CI must pass.
5. Two developers must approve before merge.

## Branch naming

Use `type/short-description`, lowercase with dashes. The `type` says what the branch is for:

| Type | Use for | Example |
| --- | --- | --- |
| `feat` | a new feature | `feat/expense-categories` |
| `fix` | a bug fix | `fix/login-validation` |
| `refactor` | code change, no behavior change | `refactor/auth-service` |
| `docs` | documentation only | `docs/setup-instructions` |
| `chore` | tooling, config, deps | `chore/docker-compose` |
| `test` | adding or fixing tests | `test/expense-api` |

```bash
git checkout main
git pull
git checkout -b feat/expense-categories
```

Keep the description short and meaningful — name it after the feature, not the file.
