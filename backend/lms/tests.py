from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from .models import Category, Course


def register(client, email, role="student", password="Str0ng!Passw0rd"):
    return client.post("/api/auth/register/", {
        "email": email, "username": email.split("@")[0], "password": password, "password2": password, "role": role,
    }, format="json")


class AuthFlowTests(APITestCase):
    def test_register_login_profile_logout(self):
        r = register(self.client, "a@x.com")
        self.assertEqual(r.status_code, 201)
        r = self.client.post("/api/auth/login/", {"email": "a@x.com", "password": "Str0ng!Passw0rd"}, format="json")
        self.assertEqual(r.status_code, 200)
        access = r.data["access"]
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(c.get("/api/auth/profile/").data["email"], "a@x.com")
        self.assertEqual(self.client.post("/api/auth/logout/", HTTP_AUTHORIZATION=f"Bearer {access}").status_code, 200)
        self.assertEqual(c.get("/api/auth/profile/").status_code, 401)  # revoked

    def test_no_token_rejected(self):
        self.assertEqual(APIClient().get("/api/courses/").status_code, 401)

    def test_cannot_self_register_as_admin(self):
        r = register(self.client, "b@x.com", role="admin")
        self.assertEqual(r.status_code, 400)


class LmsTests(APITestCase):
    def setUp(self):
        register(APIClient(), "ins@x.com", "instructor")
        register(APIClient(), "stu@x.com", "student")
        self.ins = self._client("ins@x.com")
        self.stu = self._client("stu@x.com")
        self.admin_user = User.objects.create_superuser(email="adm@x.com", username="adm", password="Str0ng!Passw0rd")
        self.adm = self._client("adm@x.com")
        self.cat = Category.objects.create(name="Prog")

    def _client(self, email):
        c = APIClient()
        r = c.post("/api/auth/login/", {"email": email, "password": "Str0ng!Passw0rd"}, format="json")
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        return c

    def _course(self):
        r = self.ins.post("/api/courses/", {"title": "T", "description": "D", "category": self.cat.pk}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["id"]

    def test_student_cannot_create_course(self):
        r = self.stu.post("/api/courses/", {"title": "T", "description": "D"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_enroll_flow_and_reports(self):
        cid = self._course()
        self.assertEqual(self.stu.post(f"/api/courses/{cid}/enroll/").status_code, 201)
        self.assertEqual(self.stu.post(f"/api/courses/{cid}/enroll/").status_code, 400)
        self.assertEqual(self.ins.get(f"/api/courses/{cid}/students/").data[0]["student_email"], "stu@x.com")
        d = self.adm.get("/api/dashboard/").data
        self.assertEqual(d["total_enrollments"], 1)
        self.assertEqual(d["role_counts"]["student"], 1)
        self.assertEqual(self.stu.get("/api/reports/users/").status_code, 403)
        self.assertEqual(self.adm.get("/api/reports/enrollments/").status_code, 200)
        self.assertEqual(self.adm.get("/api/reports/courses/").status_code, 200)

    def test_other_instructor_cannot_edit(self):
        cid = self._course()
        register(APIClient(), "ins2@x.com", "instructor")
        other = self._client("ins2@x.com")
        self.assertEqual(other.patch(f"/api/courses/{cid}/", {"title": "X"}, format="json").status_code, 403)

    def test_category_admin_only(self):
        self.assertEqual(self.ins.post("/api/categories/", {"name": "N"}, format="json").status_code, 403)
        self.assertEqual(self.adm.post("/api/categories/", {"name": "N"}, format="json").status_code, 201)


class PasswordResetTests(APITestCase):
    def test_reset_flow(self):
        from django.core import mail
        import re
        register(self.client, "r@x.com")
        self.client.post("/api/auth/forgot-password/", {"email": "r@x.com"}, format="json")
        self.assertEqual(len(mail.outbox), 1)
        m = re.search(r"/reset-password/([^/\s]+)/([^/\s]+)", mail.outbox[0].body)
        r = self.client.post("/api/auth/reset-password/", {"uid": m[1], "token": m[2], "new_password": "N3w!Passw0rd99"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post("/api/auth/reset-password/", {"uid": m[1], "token": m[2], "new_password": "An0ther!Passw0rd"}, format="json")
        self.assertEqual(r.status_code, 400)  # token single-use
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "r@x.com", "password": "N3w!Passw0rd99"}, format="json").status_code, 200)
