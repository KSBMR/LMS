from rest_framework import serializers

from accounts.models import User

from .models import Category, Course, Enrollment


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "course_count")
        read_only_fields = ("slug",)


class CourseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    instructor_name = serializers.SerializerMethodField()
    enrollment_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.BooleanField(read_only=True, default=False)
    instructor = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="instructor"), required=False)

    class Meta:
        model = Course
        fields = ("id", "title", "description", "category", "category_name", "instructor", "instructor_name",
                  "level", "duration_hours", "price", "thumbnail_url", "is_published",
                  "enrollment_count", "is_enrolled", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")

    def get_instructor_name(self, obj):
        u = obj.instructor
        return (f"{u.first_name} {u.last_name}").strip() or u.username

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "course", "course_title", "student", "student_name", "student_email",
                  "status", "progress", "enrolled_at")
        read_only_fields = ("course", "student", "enrolled_at")

    def get_student_name(self, obj):
        u = obj.student
        return (f"{u.first_name} {u.last_name}").strip() or u.username
