from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .jwt_utils import ACCESS, TokenError, decode_token
from .models import User


class JWTAuthentication(BaseAuthentication):
    """Authorization: Bearer <access token>"""
    keyword = b"bearer"

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].lower() != self.keyword:
            return None
        if len(parts) != 2:
            raise AuthenticationFailed("Invalid Authorization header.")
        try:
            payload = decode_token(parts[1].decode(), ACCESS)
        except TokenError as exc:
            raise AuthenticationFailed(str(exc))
        try:
            user = User.objects.get(pk=payload["sub"], is_active=True)
        except (User.DoesNotExist, ValueError):
            raise AuthenticationFailed("User not found or inactive.")
        request.jwt_payload = payload
        return user, payload

    def authenticate_header(self, request):
        return "Bearer"
