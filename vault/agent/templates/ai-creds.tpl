{{- with secret "secret/data/ai-service" -}}
LLM_API_KEY={{ .Data.data.llm_api_key }}
LLM_EMBEDDING_MODEL={{ .Data.data.llm_embedding_model }}
EMBEDDING_BASE_URL={{ .Data.data.embedding_base_url }}
{{- end -}}