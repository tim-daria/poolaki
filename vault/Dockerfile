FROM hashicorp/vault:2.0

WORKDIR /vault

# Copy the config and license files
COPY ./config/hcl/vault.hcl /vault/config/hcl/
COPY ./config/vault-license.hclic /vault/config/vault-license.hclic

# Copy the cert files
# COPY ./config/certs/vault.pem /vault/config/certs/vault.pem
# COPY ./config/certs/vault.key /vault/config/certs/vault.key
# COPY ./config/certs/ca.pem    /vault/config/certs/ca.pem

USER root

# Make sure Vault owns the Vault-related files
RUN mkdir -p ./data ./plugins/tmp && chown -R vault:vault /vault

USER vault
# Set ownership and mode for certificate files
# RUN chown root:vault /vault/config/certs/vault-key.pem
# RUN chmod 0644       /vault/config/certs/vault-cert.pem
# RUN chmod 0644       /vault/config/certs/vault-ca.pem
# RUN chmod 0640       /vault/config/certs/vault-key.pem

CMD vault server -config=${VAULT_CONFIG}/hcl/vault.hcl
ENTRYPOINT [ "./vault_worker.sh" ]