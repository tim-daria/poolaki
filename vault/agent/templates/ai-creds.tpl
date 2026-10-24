{{- with secret "secret/data/ai-service" -}}
LLM_API_KEY={{ or .Data.data.llm_api_key "" }}
EMBEDDING_MODEL={{ or .Data.data.embedding_model "" }}
EMBEDDING_BASE_URL={{ or .Data.data.embedding_base_url "" }}
EMBEDDING_API_KEY={{ or .Data.data.embedding_api_key "" }}
INTERNAL_API_TOKEN={{ or .Data.data.internal_api_token "" }}
{{- end -}}
