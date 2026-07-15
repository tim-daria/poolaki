import json

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .models import Organization, User

# Create your views here.


@ensure_csrf_cookie
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set"})


@login_required
@require_POST
def create_organisation(request: HttpRequest) -> JsonResponse:
    body = json.loads(request.body)
    initial_balance = body.get("initial_balance", 0)
    org = Organization.objects.create(
        name=f"{request.user.username}'s Organisation",
        is_personal=True,
        initial_balance=initial_balance,
    )
    return JsonResponse({"id": org.id}, status=201)


def testPage(request: HttpRequest) -> HttpResponse:
    if request.method == "POST":
        print("Received email: ", request.POST["email"])
        print("Received password_hash: ", request.POST["password_hash"])
        print("Received name: ", request.POST["name"])

        User.objects.create(
            email=request.POST["email"],
            password_hash=request.POST["password_hash"],
            name=request.POST["name"],
        )

    all_user = User.objects.all()

    return render(request, "poolaki_test.html", {"all_user": all_user})


@login_required
def secret(request: HttpRequest) -> HttpResponse:
    return render(request, "secret.html")
