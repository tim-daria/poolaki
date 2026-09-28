FROM cloudflare/cloudflared:2026.9.1 AS cloudflared-bin

FROM alpine:3.20
RUN apk add --no-cache ca-certificates

COPY --from=cloudflared-bin /usr/local/bin/cloudflared /usr/local/bin/cloudflared
COPY --chown=65532:65532 ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER 65532:65532
ENTRYPOINT ["/entrypoint.sh"]
