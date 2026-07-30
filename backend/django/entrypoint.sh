#!/bin/sh

echo "Running migrations..."
uv run python manage.py makemigrations
uv run python manage.py migrate

echo "Creating Admin account..."
# DJANGO_SUPERUSER_USERNAME="$DJANGO_SUPERUSER_USERNAME" \
# DJANGO_SUPERUSER_EMAIL="admin@poolaki.localhost" \
# DJANGO_SUPERUSER_PASSWORD="$DJANGO_SUPERUSER_PASSWORD" \
uv run python manage.py createsuperuser --no-input

echo "Starting server..."
uv run python manage.py runserver 0.0.0.0:8000
