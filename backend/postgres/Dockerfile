# PostgreSQL image with initialization scripts readable by the database user.
FROM pgvector/pgvector:pg18

COPY --chown=postgres:postgres default-privileges.sql init-chunks.sql /docker-entrypoint-initdb.d/
