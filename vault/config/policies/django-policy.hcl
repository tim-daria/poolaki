# read static app secrets
path "secret/data/django" {
  capabilities = ["read"]
}

# read dynamic database credentials
path "database/creds/db_role" {
  capabilities = ["read"]
}