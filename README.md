# Full Stack LMS — Django REST + React

Role-based Learning Management System (Admin / Instructor / Student) with JWT auth.

## Run it

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations accounts lms
python manage.py migrate
python manage.py seed_demo            # optional demo data
python manage.py runserver            # http://localhost:8000
python manage.py test                 # run API tests
```
Demo logins (password `Passw0rd!123`): `admin@lms.test`, `ins1@lms.test`, `stu1@lms.test`.
Password-reset e-mails print to the runserver console (console e-mail backend).

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                           # http://localhost:5173
```

## Architecture
```
backend/
  config/      settings, root urls
  accounts/    custom User (email login, role), role profiles, JWT utils, auth backend,
               middleware, permissions, auth/password/profile/user-admin APIs, e-mail templates
  lms/         Category, Course, Enrollment, dashboard + report APIs, seed command, tests
frontend/src/
  api/client.js        axios instance, JWT attach, silent refresh, error flattening
  context/AuthContext  session state, login/register/logout
  components/          ProtectedRoute (role-aware), Layout, reusable UI (cards, alerts, loader…)
  pages/               auth, profile, courses, detail, my learning, course management,
                       dashboard, reports, users, categories
```

## Security design
- **JWT** via PyJWT: `encode_token` / `decode_token` (`accounts/jwt_utils.py`), pinned HS256, required `exp/sub/jti/type`.
- Access token (15 min) returned in the JSON body and held **in memory** by the SPA; refresh token (7 days) is an
  **HttpOnly cookie** scoped to `/api/auth/` (not readable from JS). Refresh rotates the token.
- **Logout** blacklists the refresh and access token `jti` (`BlacklistedToken`) and clears the cookie.
- Passwords hashed with Django's PBKDF2-SHA256 and checked with Django's validators.
- **Password reset**: signed one-time token (`default_token_generator`, bound to the password hash, 1 h expiry);
  the forgot-password endpoint never reveals whether an email exists.
- Self-registration is limited to Student/Instructor; only admins can change roles.
- `RequestLogMiddleware` adds `X-Request-ID`, `nosniff` and logs API timing.
- Set `DJANGO_SECRET_KEY`, `JWT_SECRET`, `DJANGO_DEBUG=0` in production.

## API summary
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register/ login/ refresh/ logout/ forgot-password/ reset-password/ change-password/` |
| Profile | `GET/PATCH /api/auth/profile/` |
| Users (admin) | `GET/PATCH/DELETE /api/auth/users/` |
| Categories | `/api/categories/` (read: any user; write: admin) |
| Courses | `/api/courses/` CRUD (create: instructor/admin; edit/delete: owner/admin), `POST /{id}/enroll/`, `POST /{id}/unenroll/`, `GET /{id}/students/` |
| Enrollments | `GET /api/enrollments/`, `PATCH /api/enrollments/{id}/` (student progress) |
| Dashboard | `GET /api/dashboard/` (role-aware) |
| Reports (admin) | `GET /api/reports/users/ courses/ enrollments/` |

## Permission matrix
| Action | Admin | Instructor | Student |
|---|---|---|---|
| Manage users/categories/reports | ✔ | – | – |
| Create course | ✔ | ✔ (own) | – |
| Edit/delete course | ✔ | own only | – |
| Enroll / track progress | – | – | ✔ |
| View enrolled students | ✔ | own courses | – |
