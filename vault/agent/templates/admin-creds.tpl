{{- with secret "secret/data/django/admin" -}}
DJANGO_SUPERUSER_USERNAME={{ .Data.data.django_superuser_username }}
DJANGO_SUPERUSER_PASSWORD={{ .Data.data.django_superuser_password }}
DJANGO_SUPERUSER_EMAIL={{ .Data.data.django_superuser_email }}
{{- end -}}