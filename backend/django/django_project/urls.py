"""
URL configuration for django_project project.

The project API is versioned in the URI and mounted under `/api/v1/`, so
breaking changes can ship in a new version (e.g. `/api/v2/`) without breaking
existing clients. The versioning strategy is documented in
`docs/backend/api-versioning.md`.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

from core.views.utils import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("_allauth/", include("allauth.headless.urls")),
    path("accounts/intra42/", include("core.providers.intra42.urls")),
    path("api/v1/", include("core.urls")),
    path("", include("django_prometheus.urls")),
    path("health/", health_check),
]
