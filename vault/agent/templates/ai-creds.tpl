{{- with secret "secret/data/ai-service" -}}
LLM_API_KEY={{ .Data.data.llm_api_key }}
{{- end -}}