from django.db.models import Count, Exists, OuterRef, Q
from django.db.models.functions import TruncMonth
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrReadOnly, IsAdminOrInstructor, IsStudent

from .models import Category, Course, Enrollment
from .serializers import CategorySerializer, CourseSerializer, EnrollmentSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """Anyone authenticated can read; only admins can create / update / delete."""
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return Category.objects.annotate(course_count=Count("courses"))


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "category__name"]
    ordering_fields = ["created_at", "title", "price"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "students"):
            return [IsAuthenticated(), IsAdminOrInstructor()]
        if self.action in ("enroll", "unenroll"):
            return [IsAuthenticated(), IsStudent()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Course.objects.select_related("category", "instructor").annotate(
            enrollment_count=Count("enrollments", filter=~Q(enrollments__status="dropped"), distinct=True),
            is_enrolled=Exists(Enrollment.objects.filter(course=OuterRef("pk"), student_id=user.pk)
                               .exclude(status="dropped")),
        )
        if user.role == User.Role.STUDENT:
            qs = qs.filter(is_published=True)
        elif user.role == User.Role.INSTRUCTOR:
            qs = qs.filter(Q(is_published=True) | Q(instructor=user))
        params = self.request.query_params
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("level"):
            qs = qs.filter(level=params["level"])
        if params.get("mine") == "1":
            if user.role == User.Role.INSTRUCTOR:
                qs = qs.filter(instructor=user)
            elif user.role == User.Role.STUDENT:
                qs = qs.filter(is_enrolled=True)
        return qs

    def _check_owner(self, course):
        user = self.request.user
        if user.role != User.Role.ADMIN and course.instructor_id != user.pk:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only modify your own courses.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            instructor = serializer.validated_data.get("instructor")
            if instructor is None:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"instructor": "Admins must choose an instructor."})
            serializer.save(instructor=instructor)
        else:
            serializer.save(instructor=user)

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        if self.request.user.role == User.Role.ADMIN:
            serializer.save()
        else:  # instructors cannot reassign ownership
            serializer.save(instructor=serializer.instance.instructor)

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        course = self.get_object()
        enrollment, created = Enrollment.objects.get_or_create(student=request.user, course=course)
        if not created:
            if enrollment.status != Enrollment.Status.DROPPED:
                return Response({"detail": "You are already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)
            enrollment.status = Enrollment.Status.ACTIVE
            enrollment.save()
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def unenroll(self, request, pk=None):
        course = self.get_object()
        updated = Enrollment.objects.filter(student=request.user, course=course).exclude(status="dropped") \
            .update(status=Enrollment.Status.DROPPED)
        if not updated:
            return Response({"detail": "You are not enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Unenrolled."})

    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        course = self.get_object()
        self._check_owner(course)
        qs = course.enrollments.select_related("student").exclude(status="dropped")
        return Response(EnrollmentSerializer(qs, many=True).data)


class EnrollmentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                        viewsets.GenericViewSet):
    """Students: own enrollments (can update progress). Instructors: enrollments in their courses. Admin: all."""
    serializer_class = EnrollmentSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Enrollment.objects.select_related("course", "student")
        if user.role == User.Role.STUDENT:
            qs = qs.filter(student=user)
        elif user.role == User.Role.INSTRUCTOR:
            qs = qs.filter(course__instructor=user)
        course = self.request.query_params.get("course")
        return qs.filter(course_id=course) if course else qs

    def partial_update(self, request, *args, **kwargs):
        enrollment = self.get_object()
        if request.user.role == User.Role.INSTRUCTOR:
            return Response({"detail": "Instructors cannot edit enrollments."}, status=403)
        ser = self.get_serializer(enrollment, data={k: v for k, v in request.data.items() if k in ("progress", "status")},
                                  partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


# ----------------------------------------------------------------- Reports / dashboard
class DashboardView(APIView):
    """Role-aware summary used by the dashboard cards."""

    def get(self, request):
        user = request.user
        if user.role == User.Role.ADMIN:
            return Response(self._admin())
        if user.role == User.Role.INSTRUCTOR:
            return Response(self._instructor(user))
        return Response(self._student(user))

    def _admin(self):
        active = Enrollment.objects.exclude(status="dropped")
        return {
            "role": "admin",
            "total_users": User.objects.count(),
            "total_courses": Course.objects.count(),
            "published_courses": Course.objects.filter(is_published=True).count(),
            "total_categories": Category.objects.count(),
            "total_enrollments": active.count(),
            "completed_enrollments": active.filter(status="completed").count(),
            "role_counts": _role_counts(),
            "recent_enrollments": EnrollmentSerializer(
                Enrollment.objects.select_related("course", "student")[:5], many=True).data,
        }

    def _instructor(self, user):
        courses = Course.objects.filter(instructor=user)
        enr = Enrollment.objects.filter(course__instructor=user).exclude(status="dropped")
        return {
            "role": "instructor",
            "total_courses": courses.count(),
            "published_courses": courses.filter(is_published=True).count(),
            "total_enrollments": enr.count(),
            "total_students": enr.values("student").distinct().count(),
            "courses": list(courses.annotate(
                enrollment_count=Count("enrollments", filter=~Q(enrollments__status="dropped")))
                .values("id", "title", "enrollment_count")),
        }

    def _student(self, user):
        enr = Enrollment.objects.filter(student=user).exclude(status="dropped")
        return {
            "role": "student",
            "total_enrollments": enr.count(),
            "completed_courses": enr.filter(status="completed").count(),
            "in_progress": enr.filter(status="active").count(),
            "available_courses": Course.objects.filter(is_published=True).count(),
            "enrollments": EnrollmentSerializer(enr.select_related("course", "student"), many=True).data,
        }


def _role_counts():
    counts = {r: 0 for r, _ in User.Role.choices}
    for row in User.objects.values("role").annotate(n=Count("id")):
        counts[row["role"]] = row["n"]
    return counts


class UsersReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({
            "total_users": User.objects.count(),
            "active_users": User.objects.filter(is_active=True).count(),
            "role_counts": _role_counts(),
        })


class CoursesReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        by_category = Category.objects.annotate(course_total=Count("courses")).values("name", "course_total")
        top = Course.objects.annotate(
            enrollments_count=Count("enrollments", filter=~Q(enrollments__status="dropped"))
        ).order_by("-enrollments_count")[:10].values("id", "title", "enrollments_count", "instructor__email")
        return Response({
            "total_courses": Course.objects.count(),
            "by_category": list(by_category),
            "by_level": list(Course.objects.values("level").annotate(count=Count("id"))),
            "top_courses": list(top),
        })


class EnrollmentsReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        active = Enrollment.objects.exclude(status="dropped")
        monthly = (Enrollment.objects.annotate(month=TruncMonth("enrolled_at")).values("month")
                   .annotate(count=Count("id")).order_by("month"))
        return Response({
            "total_enrollments": Enrollment.objects.count(),
            "by_status": list(Enrollment.objects.values("status").annotate(count=Count("id"))),
            "monthly": [{"month": r["month"].strftime("%Y-%m"), "count": r["count"]} for r in monthly],
            "per_course": list(active.values("course__id", "course__title").annotate(count=Count("id"))
                               .order_by("-count")),
            "average_progress": round(sum(active.values_list("progress", flat=True)) / active.count(), 1)
            if active.exists() else 0,
        })
