#!/bin/sh
set -e

DB_SECRETS_FILE="/vault/agent/secrets/db-creds.env"
ADMIN_SECRETS_FILE="/vault/agent/secrets/admin-creds.env"
SOCIAL_AUTH_SECRETS_FILE="/vault/agent/secrets/social-auth-creds.env"
TRIGGER_FILE="/vault/agent/secrets/.reload-trigger"

until [ -f "$DB_SECRETS_FILE" ] && [ -f "$ADMIN_SECRETS_FILE" ] && [ -f "$SOCIAL_AUTH_SECRETS_FILE" ] \
	&& grep -q "^DATABASE_PASSWORD=" "$DB_SECRETS_FILE" \
	&& grep -q "^DJANGO_SUPERUSER_PASSWORD=" "$ADMIN_SECRETS_FILE" \
	&& grep -q "^INTRA42_CLIENT_SECRET=" "$SOCIAL_AUTH_SECRETS_FILE"; do
	echo "Waiting for initial Vault secrets.."
	sleep 1
done

set -a
. "$DB_SECRETS_FILE"
. "$ADMIN_SECRETS_FILE"
. "$SOCIAL_AUTH_SECRETS_FILE"
set +a

APP_PID=""

start_app() {
	echo "Starting Django with DATABASE_USER=$DATABASE_USER"

	echo "Running migrations..."
	# python manage.py makemigrations
	python manage.py migrate --noinput

	echo "Creating Admin account if needed..."
	# python manage.py createsuperuser --noinput 2>/dev/null || true
	python manage.py shell < /app/django_project/sync_superuser.py

	echo "Starting server..."
	# exec python manage.py runserver 0.0.0.0:8000 &
	python manage.py runserver 0.0.0.0:8000 &
	APP_PID=$!
}

restart_app() {
	echo "Credentials changed, restarting app..."
	kill "$APP_PID" 2>/dev/null || true
	wait "$APP_PID" 2>/dev/null || true

	set -a
	. "$DB_SECRETS_FILE"
	. "$ADMIN_SECRETS_FILE"
	. "$SOCIAL_AUTH_SECRETS_FILE"
	set +a
	
	start_app
}

trap 'echo "Shutting down..."; kill "$APP_PID" 2>/dev/null; exit 0' TERM INT

start_app

# Watch for Vault Agent's reload trigger and restart app on change
LAST_MTIME=0
if [ -f "$TRIGGER_FILE" ]; then
  LAST_MTIME=$(stat -c %Y "$TRIGGER_FILE" 2>/dev/null || stat -f %m "$TRIGGER_FILE")
fi

while true; do
  if [ -f "$TRIGGER_FILE" ]; then
    CUR_MTIME=$(stat -c %Y "$TRIGGER_FILE" 2>/dev/null || stat -f %m "$TRIGGER_FILE")
    if [ "$CUR_MTIME" != "$LAST_MTIME" ]; then
      LAST_MTIME=$CUR_MTIME
      restart_app
    fi
  fi
  sleep 5
done