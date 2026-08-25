ui = true
disable_mlock = true

# --- Configure the non-loopback interface ---
api_addr     = "http://vault:8200"
cluster_addr = "http://vault:8201"
cluster_name = "vault"

# --- Plugin configuration ---
plugin_directory = "/vault/plugins/"
plugin_tmpdir    = "/vault/plugins/tmp"

# --- Listener configuration ---
listener "tcp" {
  address         = "[::]:8200"
  tls_disable        = "true"
}

# --- Integrated storage ---
storage "raft" {
  path    = "/vault/data"
  node_id = "vault"
}
