pid_file = "/tmp/agent.pid"

vault {
  address = "http://vault:8200"
}

auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/vault/secure/id/django_role_id"
      secret_id_file_path = "/vault/secure/id/django_secret_id"
      remove_secret_id_file_after_reading = true
    }
  }

  sink "file" {
    config = {
      path = "/vault/secure/id/agent-token"
	  mode = 0600
    }
  }
}

template {
  source      = "/vault/agent/templates/db-creds.tpl"
  destination = "/vault/agent/secrets/db-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/admin-creds.tpl"
  destination = "/vault/agent/secrets/admin-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/social-auth-creds.tpl"
  destination = "/vault/agent/secrets/social-auth-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/.reload-trigger"
}