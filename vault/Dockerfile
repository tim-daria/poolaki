FROM hashicorp/vault:2.0

WORKDIR /vault

USER root

RUN apk add --no-cache jq bash

# COPY ./config/vault.hcl /vault/config/hcl/
COPY --chown=vault:vault entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh && \
    mkdir -p ./data ./plugins/tmp ./secure/django && \
    chown -R vault:vault /vault

USER vault

ENTRYPOINT [ "/entrypoint.sh" ]