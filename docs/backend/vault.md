# HashiCorp Vault

## Overview

HashiCorp Vault is a dedicated secrets manager. In this project it is the single place that stores and hands out every sensitive value the web application and its supporting services need — the database credentials, the LLM API key, the Grafana and Cloudflare logins, and the 42 social-auth tokens.

The Vault server and the Vault Agent each run in their own Docker container.

### Why Vault

Keeping the secrets in Vault stores them **encrypted at rest** and **isolated** (each service can only read the paths its policy allows), instead of plaintext scattered across containers. It also gives us things a plain `.env` cannot:

- **Short-lived database credentials.** Vault generates a Postgres username and password per request with a short TTL and drops the user when the lease expires — a leaked credential stops working on its own (see *Dynamic PostgreSQL Credentials* below).
- **Isolated, read-only access.** The Vault Agent’s AppRole policy grants read access only to the secret paths the services consume.
- **No stale credentials.** On update, the Vault Agent rewrites the service’s env file and triggers a reload.


### Startup flow

- Docker starts the Vault & Vault Agent containers.
- The Vault entrypoint script reads the environment variables and stores them.
- Vault becomes available.
- The Vault Agent authenticates to Vault.
- The agent retrieves the secrets and creates environment files for the services.
- Services start using their generated environment files.

## Dynamic PostgreSQL Credentials

The Vault Agent authenticates to Vault using AppRole and receives a Vault token.

Its policy permits it to request credentials from a specific PostgreSQL database role, such as `database/creds/my-app`.

When requested, Vault uses its configured PostgreSQL connection and role settings to create a unique, temporary database username and password. The Agent writes those credentials to the service’s environment file. They are valid for a limited lease period; when the lease expires or is revoked, Vault removes or disables the database user.

The vault agent rotates the database credentials automatically when the lease of the credentials expire.

## KV Secrets Engine

The KV (key-value) secrets engine stores static secrets, such as API keys, usernames, passwords and application configuration. Unlike the database secrets engine, it does not generate or rotate credentials automatically.

This guide assumes the engine is mounted at secret/ and uses KV v2. KV v2 keeps secret versions, so updating a secret creates a new version rather than simply overwriting the old one.

### Add a secret using the CLI

Authenticate to Vault with an account or token that has permission to write to the path. For example, to create or update secrets for the web app:

**Create or update secrets**
```
vault kv put -mount=secret <secret_name> \
  KEY1="Value1" \
  KEY2="Value2"
```
Here, secret is the mount and `<service_name>` is the secret path.

```
docker compose exec vault vault kv put secret/ai-service llm_api_key="123Test"
```
You can also write the full secret path instead the `-mount=secret` flag.

To add or change fields, run on of the commands *<u>with the complete set of key-value pairs you want stored</u>*; kv put writes a new version.

**The new version only contains the information that you write to it. Even if variables already exist and don't change, they won't be included in the new version unless you write them**.

### Add a secret using the Vault UI

- Sign in to the Vault UI.
- Open Secrets and select the secret/ in the secrets engines.
- Navigate to the desired path, such as `django` or `grafana`.
- Select "Create new" under "Current version".
- Change or add the key-value pair.
- Select Save.

The UI creates a new version when you save changes to an existing KV v2 secret.

## Inter-Service Bearer Token

The AI Service and the backend share one static secret, `internal_api_token`, stored in the `secret/ai-service` KV path next to the LLM API key.

- The Vault Agent renders it to both services' env files as `INTERNAL_API_TOKEN` (`vault/agent/templates/ai-creds.tpl` for the AI Service, `ai-tokens.tpl` for the backend, wired in `vault/config/hcl/agent.hcl`), so the token is never committed or set by hand.
- The token is the AI Service's identity on the backend's internal financial data API: every request to `/api/internal/v1/` must carry `Authorization: Bearer <token>`, otherwise the request is rejected with `401`.
- While the key is missing from Vault or the token is empty, the backend fails closed: the internal API answers `401` to every caller. The templates render the token with `| default ""` on purpose — an unset key must become an empty value, not Go's `<nil>`, which is not a valid shell assignment and would break the services' entrypoints when they source the env files.
- To set or rotate the token on an already-initialized vault:

  ```
  docker compose exec vault sh -c \
    "vault login $(jq -r .root_token /vault/secure/vault-init.json) >/dev/null && \
     vault kv merge secret/ai-service internal_api_token=<new-token>"
  ```

  Use `kv merge`, not `kv put` — `put` replaces the whole secret and would drop `llm_api_key`. The agent re-renders both env files, the backend self-restarts on the new env; the AI Service reads the env only at startup, so restart it (`docker compose restart ai-service`) for the change to take effect there.

## Read the vault values
(Only for test and debugging)

To read your credentials you can login to the vault UI under

`http://localhost:8200/ui/vault/auth`

Choose "Token" as login method and use the value you get with the following command.

```
docker compose exec vault jq -r '.root_token' /vault/secure/vault-init.json
```

Or you can use the script to read all credentials with `./vault/read_vault.sh`
It will show the status of the vault, all stored credentials and the root token in your terminal.
