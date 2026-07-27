#!/bin/sh

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Creating Admin account..."
DJANGO_SUPERUSER_USERNAME="$DJANGO_SUPERUSER_USERNAME" \
DJANGO_SUPERUSER_EMAIL="admin@poolaki.localhost" \
DJANGO_SUPERUSER_PASSWORD="$DJANGO_SUPERUSER_PASSWORD" \
python manage.py createsuperuser --no-input

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
