from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.services.balance import set_initial_balance

from .models import (
    User,
)


class SetInitialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def _handle(self, request: Request) -> Response:
        assert isinstance(request.user, User)

        initial_balance = request.data.get("initial_balance")
        if initial_balance is None:
            return Response({"error": "initial_balance is required"}, status=400)

        try:
            org = set_initial_balance(request.user, initial_balance)
        except ValueError as e:
            return Response({"error": str(e)}, status=404)

        return Response({"initial_balance": str(org.initial_balance)})

    def post(self, request: Request) -> Response:
        return self._handle(request)

    def patch(self, request: Request) -> Response:
        return self._handle(request)


# Create your views here.
def testPage(request: HttpRequest) -> HttpResponse:
    if request.method == "POST":
        print("Received email: ", request.POST["email"])
        # print("Received password_hash: ", request.POST["password_hash"])
        # print("Received name: ", request.POST["name"])

        User.objects.create(
            email=request.POST["email"],
            # password_hash=request.POST["password_hash"],
            # name=request.POST["name"],
        )

    all_user = User.objects.all()

    return render(request, "poolaki_test.html", {"all_user": all_user})


@login_required
def secret(request: HttpRequest) -> HttpResponse:
    return render(request, "secret.html")
