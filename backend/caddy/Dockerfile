FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/corazawaf/coraza-caddy/v2

FROM caddy:2

RUN apk add --no-cache git ca-certificates

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Pin to a specific version! Don't just grab "master"
RUN git clone --depth 1 --branch v4.3.0 \
    https://github.com/coreruleset/coreruleset /tmp/crs && \
    mkdir -p /etc/caddy/coraza && \
    cp -r /tmp/crs/rules /etc/caddy/coraza/ && \
    cp /tmp/crs/crs-setup.conf.example /etc/caddy/coraza/crs-setup.conf && \
    rm -rf /tmp/crs

COPY coraza.conf /etc/caddy/coraza.conf