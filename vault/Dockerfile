FROM hashicorp/vault:2.0

WORKDIR /vault

# Copy the config and license files
COPY ./config/hcl/vault.hcl /vault/config/hcl/
COPY ./config/vault-license.hclic /vault/config/vault-license.hclic

USER root

# Make sure Vault owns the Vault-related files
RUN mkdir -p ./data ./plugins/tmp && chown -R vault:vault /vault

USER vault

CMD vault server -config=${VAULT_CONFIG}/hcl/vault.hcl
# ENTRYPOINT [ "./vault_worker.sh" ]