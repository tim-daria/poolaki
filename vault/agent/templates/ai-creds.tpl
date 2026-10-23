{{- with secret "secret/data/ai-service" -}}
LLM_API_KEY={{ .Data.data.llm_api_key }}
INTERNAL_API_TOKEN={{ .Data.data.internal_api_token }}
{{- end -}}
