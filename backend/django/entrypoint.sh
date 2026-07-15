#!/bin/sh

echo "Running migrations..."
uv run python manage.py makemigrations
uv run python manage.py migrate

echo "Creating Admin account..."
DJANGO_SUPERUSER_USERNAME="$DJANGO_ADMIN_NAME" \
DJANGO_SUPERUSER_EMAIL="admin@poolaki.localhost" \
DJANGO_SUPERUSER_PASSWORD="$DJANGO_ADMIN_PASSWORD" \
uv run python manage.py createsuperuser --no-input

echo "Linking admin email to allauth..."
uv run python manage.py shell -c "
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
User = get_user_model()
for user in User.objects.all():
    EmailAddress.objects.get_or_create(user=user, email=user.email, defaults={'primary': True, 'verified': True})
"

echo "Starting server..."
uv run python manage.py runserver 0.0.0.0:8000