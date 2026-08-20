ui = true
disable_mlock = true
license_path = "/vault/config/vault-license.hclic"

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
#  tls_cert_file      = "<path_to_cert_files>/vault.pem"
#  tls_key_file       = "<path_to_cert_files>/vault.key"
#  tls_client_ca_file = "<path_to_cert_files>/ca.pem"
}

# --- Integrated storage ---
storage "raft" {
  path    = "/vault/data"
  node_id = "vault"
}
