{{/* Single-quoted: entrypoint.sh sources this file; an unquoted key would
     undergo shell expansion ($, !, backticks). Django's key alphabet has no '. */}}
{{- with secret "secret/data/django/secret_key" -}}
SECRET_KEY='{{ .Data.data.secret_key }}'
{{- end -}}
