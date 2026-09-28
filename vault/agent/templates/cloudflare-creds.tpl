{{- with secret "secret/data/cloudflare" -}}
TUNNEL_TOKEN={{ .Data.data.tunnel_token }}
{{- end -}}