{{- with secret "database/creds/db_role" -}}
DATABASE_USER={{ .Data.username }}
DATABASE_PASSWORD={{ .Data.password }}
PGUSER={{ .Data.username }}
PGPASSWORD={{ .Data.password }}
{{- end -}}