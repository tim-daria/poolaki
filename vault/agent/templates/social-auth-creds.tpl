{{- with secret "secret/data/django/social_auth" -}}
INTRA42_CLIENT_ID={{ .Data.data.intra42_client_id }}
INTRA42_CLIENT_SECRET={{ .Data.data.intra42_client_secret }}
{{- end -}}