from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render

from .models import (
    User,
)


# Create your views here.
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
