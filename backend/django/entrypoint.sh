#!/bin/sh

echo "Running migrations..."
uv run python manage.py makemigrations
uv run python manage.py migrate

echo "Creating Admin account..."
uv run python manage.py createsuperuser --no-input

echo "Starting server..."
uv run python manage.py runserver 0.0.0.0:8000
