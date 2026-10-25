from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        INSTRUCTOR = "instructor", "Instructor"
        STUDENT = "student", "Student"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)

    USERNAME_FIELD = "email"  
    REQUIRED_FIELDS = ["username"]

    def save(self, *args, **kwargs):
        
        if self.is_superuser:
            self.role = self.Role.ADMIN
        self.email = self.email.lower()
        super().save(*args, **kwargs)

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f"{self.email} ({self.role})"


class StudentProfile(models.Model):
    """Role-specific data for students."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_id = models.CharField(max_length=30, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    interests = models.CharField(max_length=255, blank=True)


class InstructorProfile(models.Model):
    """Role-specific data for instructors."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="instructor_profile")
    expertise = models.CharField(max_length=255, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)


class BlacklistedToken(models.Model):
    """JWTs revoked at logout / refresh rotation (looked up by their `jti`)."""
    jti = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
