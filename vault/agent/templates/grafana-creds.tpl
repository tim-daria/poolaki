{{- with secret "secret/data/grafana" -}}
GF_SECURITY_ADMIN_USER={{ .Data.data.gf_admin_user }}
GF_SECURITY_ADMIN_PASSWORD={{ .Data.data.gf_admin_password }}
GF_SMTP_USER={{ .Data.data.smtp_user }}
GF_SMTP_PASSWORD={{ .Data.data.smtp_password }}
GF_SMTP_FROM_ADDRESS={{ .Data.data.smtp_from_address }}
{{- end -}}
