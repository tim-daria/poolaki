import os
import time
import hvac
from hvac.exceptions import VaultDown, VaultError


def read_secret(env_var_name, required=True):
	file_env = f"{env_var_name}"
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

def wait_for_vault(client, timeout=60, interval=5):
	"""Block until Vault is initialized and unsealed."""
	start = time.time()
	while time.time() - start < timeout:
		try:
			status = client.sys.read_health_status(method="GET")
			# hvac returns a dict when response is JSON
			if isinstance(status, dict):
				sealed = status.get("sealed", True)
				initialized = status.get("initialized", False)
				if initialized and not sealed:
					return
		except Exception:
			pass
		time.sleep(interval)
	raise RuntimeError("Timed out waiting for Vault to become unsealed")

def get_db_credentials():
	client = hvac.Client(url=os.environ["VAULT_ADDR"])

	wait_for_vault(client)

	role_id = read_secret("VAULT_ROLE_ID")
	secret_id = read_secret("VAULT_SECRET_ID")

	try:
		client.auth.approle.login(role_id=role_id, secret_id=secret_id)
	except VaultError as e:
		raise RuntimeError(f"AppRole login failed: {e}") from e

	if not client.is_authenticated():
		raise RuntimeError("Vault authentication failed silently")

	try:
		creds = client.secrets.database.generate_credentials(name="db_role")
	except VaultError as e:
		raise RuntimeError(f"Failed to generate DB credentials: {e}") from e

	return creds["data"]["username"], creds["data"]["password"]