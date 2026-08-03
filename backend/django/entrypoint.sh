#!/bin/sh

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Creating Admin account..."
python manage.py createsuperuser --no-input

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
