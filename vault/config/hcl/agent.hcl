pid_file = "/tmp/agent.pid"

vault {
  address = "http://vault:8200"
}

auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/vault/secure/id/role_id"
      secret_id_file_path = "/vault/secure/id/secret_id"
      remove_secret_id_file_after_reading = false
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
  destination = "/vault/agent/secrets/django/db-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/django/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/admin-creds.tpl"
  destination = "/vault/agent/secrets/django/admin-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/django/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/social-auth-creds.tpl"
  destination = "/vault/agent/secrets/django/social-auth-creds.env"
  perms       = "0440"
  command     = "touch /vault/agent/secrets/django/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/grafana-creds.tpl"
  destination = "/vault/agent/secrets/grafana/grafana-creds.env"
  perms       = "0444"
  command     = "touch /vault/agent/secrets/grafana/.reload-trigger"
}

template {
  source      = "/vault/agent/templates/cloudflare-creds.tpl"
  destination = "/vault/agent/secrets/cloudflare/cloudflare-creds.env"
  perms       = "0444"
}