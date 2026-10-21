"""JWT encode / decode helpers (PyJWT) plus cookie + blacklist utilities."""
import uuid
from datetime import datetime, timezone

import jwt
from django.conf import settings
from django.utils import timezone as dj_tz

from .models import BlacklistedToken

ACCESS = "access"
REFRESH = "refresh"


class TokenError(Exception):
    pass


def encode_token(user, token_type):
    cfg = settings.JWT
    lifetime = cfg["ACCESS_LIFETIME"] if token_type == ACCESS else cfg["REFRESH_LIFETIME"]
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.pk),
        "role": user.role,
        "email": user.email,
        "type": token_type,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, cfg["SECRET"], algorithm=cfg["ALGORITHM"])


def decode_token(token, expected_type):
    cfg = settings.JWT
    try:
        payload = jwt.decode(
            token,
            cfg["SECRET"],
            algorithms=[cfg["ALGORITHM"]],  # pin algorithm; never trust the header
            options={"require": ["exp", "sub", "jti", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise TokenError("Token has expired.")
    except jwt.InvalidTokenError:
        raise TokenError("Token is invalid.")
    if payload.get("type") != expected_type:
        raise TokenError("Wrong token type.")
    if BlacklistedToken.objects.filter(jti=payload["jti"]).exists():
        raise TokenError("Token has been revoked.")
    return payload


def blacklist_payload(payload):
    BlacklistedToken.objects.get_or_create(
        jti=payload["jti"],
        defaults={"expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc)},
    )


def purge_expired_blacklist():
    BlacklistedToken.objects.filter(expires_at__lt=dj_tz.now()).delete()


def set_refresh_cookie(response, refresh_token):
    cfg = settings.JWT
    response.set_cookie(
        cfg["REFRESH_COOKIE"],
        refresh_token,
        max_age=int(cfg["REFRESH_LIFETIME"].total_seconds()),
        httponly=True,  # not readable from JavaScript -> safe from XSS theft
        secure=cfg["COOKIE_SECURE"],
        samesite=cfg["COOKIE_SAMESITE"],
        path=cfg["REFRESH_COOKIE_PATH"],
    )


def clear_refresh_cookie(response):
    cfg = settings.JWT
    response.delete_cookie(cfg["REFRESH_COOKIE"], path=cfg["REFRESH_COOKIE_PATH"], samesite=cfg["COOKIE_SAMESITE"])
