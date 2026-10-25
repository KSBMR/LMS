from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets, mixins, filters

from . import jwt_utils as jwt_
from .models import User
from .permissions import IsAdmin
from .serializers import (AdminUserUpdateSerializer, ChangePasswordSerializer, ForgotPasswordSerializer,
                          LoginSerializer, ProfileUpdateSerializer, RegisterSerializer,
                          ResetPasswordSerializer, UserSerializer)


def _auth_response(user, http_status=status.HTTP_200_OK):
    """Access token goes in the body (kept in memory by the SPA); refresh token in an HttpOnly cookie."""
    response = Response({"access": jwt_.encode_token(user, jwt_.ACCESS), "user": UserSerializer(user).data},
                        status=http_status)
    jwt_.set_refresh_cookie(response, jwt_.encode_token(user, jwt_.REFRESH))
    return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return _auth_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = LoginSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        return _auth_response(ser.validated_data["user"])


class RefreshView(APIView):
    """Rotate: validate refresh cookie, blacklist it, issue a new pair."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.COOKIES.get(settings.JWT["REFRESH_COOKIE"])
        if not token:
            return Response({"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            payload = jwt_.decode_token(token, jwt_.REFRESH)
            user = User.objects.get(pk=payload["sub"], is_active=True)
        except (jwt_.TokenError, User.DoesNotExist, ValueError) as exc:
            response = Response({"detail": str(exc) or "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
            jwt_.clear_refresh_cookie(response)
            return response
        jwt_.blacklist_payload(payload)
        jwt_.purge_expired_blacklist()
        return _auth_response(user)


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.COOKIES.get(settings.JWT["REFRESH_COOKIE"])
        if token:
            try:
                jwt_.blacklist_payload(jwt_.decode_token(token, jwt_.REFRESH))
            except jwt_.TokenError:
                pass
        
        header = request.headers.get("Authorization", "")
        if header.lower().startswith("bearer "):
            try:
                jwt_.blacklist_payload(jwt_.decode_token(header.split(" ", 1)[1], jwt_.ACCESS))
            except jwt_.TokenError:
                pass
        response = Response({"detail": "Logged out."})
        jwt_.clear_refresh_cookie(response)
        return response


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = ForgotPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"].lower()
        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)  # HMAC bound to password hash + timestamp
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            ctx = {"user": user, "reset_url": reset_url}
            msg = EmailMultiAlternatives(
                "Reset your LMS password",
                render_to_string("emails/password_reset.txt", ctx),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
            msg.attach_alternative(render_to_string("emails/password_reset.html", ctx), "text/html")
            msg.send(fail_silently=True)
        
        return Response({"detail": "If that email is registered, a reset link has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.contrib.auth import password_validation
        from django.core.exceptions import ValidationError as DjangoValidationError
        ser = ResetPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(d["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, d["token"]):
            return Response({"detail": "Reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            password_validation.validate_password(d["new_password"], user)
        except DjangoValidationError as exc:
            return Response({"new_password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(d["new_password"])
        user.save()  
        return Response({"detail": "Password has been reset. You can now log in."})


class ProfileView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        ser = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(UserSerializer(user).data)

    put = patch


class ChangePasswordView(APIView):
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password changed. Please log in again."})


class AdminUserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                       mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Admin-only user management: list, change role / activate, delete."""
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all().order_by("-date_joined")
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "username", "first_name", "last_name"]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        return AdminUserUpdateSerializer if self.action in ("update", "partial_update") else UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        return qs.filter(role=role) if role else qs

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        instance = self.get_object()
        ser = AdminUserUpdateSerializer(instance, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        if instance.pk == request.user.pk:
            return Response({"detail": "You cannot change your own role or status."}, status=400)
        ser.save()
        return Response(UserSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response({"detail": "You cannot delete yourself."}, status=400)
        return super().destroy(request, *args, **kwargs)
