from django.contrib.auth import get_user_model
from dotenv import dotenv_values

ADMIN_SECRETS_FILE = "/vault/agent/secrets/admin-creds.env"

creds = dotenv_values(ADMIN_SECRETS_FILE)

username = creds["DJANGO_SUPERUSER_USERNAME"]
password = creds["DJANGO_SUPERUSER_PASSWORD"]
email = creds.get("DJANGO_SUPERUSER_EMAIL", "")

if not username or not password:
    raise ValueError("DJANGO_SUPERUSER_USERNAME or DJANGO_SUPERUSER_PASSWORD missing/empty in secrets file")

User = get_user_model()

user, created = User.objects.get_or_create(
    username=username,
    defaults={"email": email, "is_superuser": True, "is_staff": True},
)

user.email = email
user.is_superuser = True
user.is_staff = True
user.set_password(password)
user.save()

print(f"Superuser '{username}' {'created' if created else 'updated'} successfully.")