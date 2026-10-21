from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import User


def _role(request):
    u = request.user
    return u.role if u and u.is_authenticated else None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == User.Role.ADMIN


class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == User.Role.INSTRUCTOR


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == User.Role.STUDENT


class IsAdminOrInstructor(BasePermission):
    def has_permission(self, request, view):
        return _role(request) in (User.Role.ADMIN, User.Role.INSTRUCTOR)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in SAFE_METHODS or _role(request) == User.Role.ADMIN
