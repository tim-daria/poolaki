from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    User,
)
from core.serializers import InitialBalanceSerializer
from core.services.balance import set_initial_balance


class SetInitialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        needs_initial_balance = bool(request.session.get("needs_initial_balance", False))
        return Response({"needs_initial_balance": needs_initial_balance})

    def _handle(self, request: Request) -> Response:
        assert isinstance(request.user, User)

        serializer = InitialBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        initial_balance = serializer.validated_data["initial_balance"]

        try:
            org = set_initial_balance(request.user, initial_balance)
        except ValueError as e:
            return Response({"error": str(e)}, status=404)

        request.session.pop("needs_initial_balance", None)
        request.session.modified = True

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


@ensure_csrf_cookie
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set"})
