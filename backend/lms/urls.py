from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("courses", views.CourseViewSet, basename="course")
router.register("enrollments", views.EnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view()),
    path("reports/users/", views.UsersReportView.as_view()),
    path("reports/courses/", views.CoursesReportView.as_view()),
    path("reports/enrollments/", views.EnrollmentsReportView.as_view()),
    path("", include(router.urls)),
]
