from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers

from .models import InstructorProfile, StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ("student_id", "education_level", "interests")


class InstructorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorProfile
        fields = ("expertise", "qualification", "years_of_experience")


class UserSerializer(serializers.ModelSerializer):
    """Read serializer including role-specific profile data."""
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "role", "phone", "bio",
                  "is_active", "date_joined", "profile")
        read_only_fields = fields

    def get_profile(self, obj):
        if obj.role == User.Role.STUDENT and hasattr(obj, "student_profile"):
            return StudentProfileSerializer(obj.student_profile).data
        if obj.role == User.Role.INSTRUCTOR and hasattr(obj, "instructor_profile"):
            return InstructorProfileSerializer(obj.instructor_profile).data
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[User.Role.STUDENT, User.Role.INSTRUCTOR], default=User.Role.STUDENT)

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "role", "password", "password2")

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        user = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            password_validation.validate_password(attrs["password"], user)
        except Exception as exc:  # django ValidationError
            raise serializers.ValidationError({"password": list(getattr(exc, "messages", [str(exc)]))})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # hashed (PBKDF2-SHA256)
        user.save()
        if user.role == User.Role.STUDENT:
            StudentProfile.objects.create(user=user)
        elif user.role == User.Role.INSTRUCTOR:
            InstructorProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(request=self.context.get("request"), email=attrs["email"].lower(), password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")
        attrs["user"] = user
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Common fields + optional role-specific fields under `profile`."""
    profile = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "phone", "bio", "profile")

    def validate_username(self, value):
        qs = User.objects.filter(username__iexact=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This username is taken.")
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if profile_data:
            if instance.role == User.Role.STUDENT:
                obj, _ = StudentProfile.objects.get_or_create(user=instance)
                ser = StudentProfileSerializer(obj, data=profile_data, partial=True)
            elif instance.role == User.Role.INSTRUCTOR:
                obj, _ = InstructorProfile.objects.get_or_create(user=instance)
                ser = InstructorProfileSerializer(obj, data=profile_data, partial=True)
            else:
                ser = None
            if ser is not None:
                ser.is_valid(raise_exception=True)
                ser.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("role", "is_active")
