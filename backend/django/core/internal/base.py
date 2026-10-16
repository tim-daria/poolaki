# """Shared base for /api/internal/v1/ views.

# DRF only reads the exception handler from settings, so the contract error
# shape is wired per-view here instead of globally.
# """

# from rest_framework.response import Response
# from rest_framework.views import APIView

# from core.internal.authentication import InternalTokenAuthentication
# from core.internal.errors import internal_exception_handler
# from core.internal.permissions import IsInternalService


# class InternalAPIView(APIView):
#     """Service Bearer auth + AI contract error shape for internal endpoints."""

#     authentication_classes = [InternalTokenAuthentication]
#     permission_classes = [IsInternalService]

#     def handle_exception(self, exc: Exception) -> Response:
#         response = internal_exception_handler(exc, self.get_exception_handler_context())
#         if response is None:
#             self.raise_uncaught_exception(exc)
#         response.exception = True
#         return response
