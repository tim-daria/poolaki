# Authentication

Authentication is handled via `django-allauth Headless`.

Users can:

- register with email, username, and password
- log in with email and password
- authenticate through 42 OAuth (`intra42`)

The callback configured in the 42 Developer Portal is:

```text
http://poolaki.localhost/accounts/intra42/callback/
```

## CSRF token

```http
GET /api/csrf/
```

Returns a CSRF cookie and a simple JSON response:

```json
{
  "detail": "CSRF cookie set"
}
```

## Auth session

```http
GET /_allauth/browser/v1/auth/session
```

Returns metadata about the authenticated session.

## Sign up

```http
POST /_allauth/browser/v1/auth/signup
```

Request body:

```json
{
  "email": "user@example.com",
  "username": "alice",
  "password": "strong-password"
}
```

## Log in

```http
POST /_allauth/browser/v1/auth/login
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

## Log out

```http
DELETE /_allauth/browser/v1/auth/session
```

## Social login redirect

```http
POST /_allauth/browser/v1/auth/provider/redirect
```

Form parameters:

```text
provider=intra42
process=login
callback_url=https://poolaki.localhost/oauth/callback
```
