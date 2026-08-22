import os
import hvac


def read_secret(env_var_name, required=True):
    file_env = f"{env_var_name}_FILE"
    file_path = os.environ.get(file_env)
    if file_path:
        with open(file_path, "r") as f:
            return f.read().strip()

    value = os.environ.get(env_var_name)
    if required and value is None:
        raise RuntimeError(
            f"Missing secret: set {file_env} or {env_var_name}"
        )
    return value


def get_db_credentials():
    """
    Authenticates against Vault using AppRole and fetches
    dynamic database credentials.
    """
    client = hvac.Client(url=os.environ["VAULT_ADDR"])

    role_id = read_secret("VAULT_ROLE_ID")
    secret_id = read_secret("VAULT_SECRET_ID")

    client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id,
    )

    creds = client.secrets.database.generate_credentials(
        name="db_role"  # <-- your Vault DB role name
    )

    return creds["data"]["username"], creds["data"]["password"]