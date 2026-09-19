FROM grafana/grafana:13.1

COPY --chown=grafana:grafana ./monitoring/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]