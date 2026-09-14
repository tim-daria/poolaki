# read dynamic database credentials
path "database/creds/db_role" {
  capabilities = ["read"]
}

# read static django admin credentials
path "secret/data/django/admin" {
  capabilities = ["read"]
}

# read static 42 social auth credentials
path "secret/data/django/social_auth" {
	capabilities = ["read"]
}