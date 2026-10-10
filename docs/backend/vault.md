# HashiCorp Vault

## Overview

HashiCorp Vault is used to store and provide secrets to the web application and its supporting services. All components, including Vault, run in Docker.

At startup, the Vault container’s entrypoint script reads the required environment variables, unlocks the vault and writes the secrets into the vault.

The Vault Agent then authenticates to Vault, retrieves the secrets needed by each service, and writes them to service-specific environment files into the service-container.

### Startup flow

- Docker starts the vault & vault agent containers.
- The vault entrypoint script reads the environment variables and stores them.
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