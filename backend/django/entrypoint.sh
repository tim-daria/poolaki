#!/bin/sh

echo "Running migrations..."
uv run python manage.py makemigrations
uv run python manage.py migrate

echo "Starting server..."
uv run python manage.py runserver 0.0.0.0:8000