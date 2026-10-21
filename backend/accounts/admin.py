from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import BlacklistedToken, InstructorProfile, StudentProfile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "is_active")
    list_filter = ("role", "is_active")
    ordering = ("email",)
    fieldsets = UserAdmin.fieldsets + (("LMS", {"fields": ("role", "phone", "bio")}),)


admin.site.register(StudentProfile)
admin.site.register(InstructorProfile)
admin.site.register(BlacklistedToken)
