{{- with secret "secret/data/ai-service" -}}
INTERNAL_API_TOKEN={{ .Data.data.internal_api_token }}
{{- end -}}
