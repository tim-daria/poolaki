#!/bin/sh

until [ -s /vault/secure/django/vault_role_id ] && [ -s /vault/secure/django/vault_secret_id ]; do
    echo "Waiting for Vault AppRole credentials..."
    sleep 1
done

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Creating Admin account..."
python manage.py createsuperuser --noinput

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
