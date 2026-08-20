from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set"})


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})
