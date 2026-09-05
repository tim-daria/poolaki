ui = true
disable_mlock = true

# --- Configure the non-loopback interface ---
api_addr     = "http://vault:8200"

# --- Plugin configuration ---
plugin_directory = "/vault/plugins/"
plugin_tmpdir    = "/vault/plugins/tmp"

# --- Listener configuration ---
listener "tcp" {
  address         = "[::]:8200"
  tls_disable        = "true"
}

storage "file" {
  path = "/vault/data"
}