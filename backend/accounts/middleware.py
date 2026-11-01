import logging
import time
import uuid

logger = logging.getLogger("lms.requests")


class RequestLogMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        start = time.monotonic()
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        response["X-Content-Type-Options"] = "nosniff"
        if request.path.startswith("/api/"):
            ms = (time.monotonic() - start) * 1000
            logger.info("%s %s %s %s %.1fms", request_id, request.method, request.path, response.status_code, ms)
        return response
