from django.core.management.base import BaseCommand

from accounts.models import InstructorProfile, StudentProfile, User
from lms.models import Category, Course, Enrollment


class Command(BaseCommand):
    help = "Create demo users, categories, courses and enrollments (password: Passw0rd!123)."

    def handle(self, *args, **opts):
        pw = "Passw0rd!123"

        def make(email, username, role, **extra):
            u, created = User.objects.get_or_create(email=email, defaults={"username": username, "role": role, **extra})
            if created:
                u.set_password(pw)
                if role == "admin":
                    u.is_staff = u.is_superuser = True
                u.save()
                if role == "student":
                    StudentProfile.objects.create(user=u, student_id=f"S-{u.pk:04d}")
                if role == "instructor":
                    InstructorProfile.objects.create(user=u, expertise="Software Engineering", years_of_experience=5)
            return u

        make("admin@lms.test", "admin", "admin", first_name="Ada", last_name="Admin")
        ins = [make("ins1@lms.test", "ins1", "instructor", first_name="Ian", last_name="Instructor"),
               make("ins2@lms.test", "ins2", "instructor", first_name="Iris", last_name="Teacher")]
        studs = [make(f"stu{i}@lms.test", f"stu{i}", "student", first_name=f"Student{i}") for i in range(1, 6)]

        cats = {n: Category.objects.get_or_create(name=n)[0] for n in ("Programming", "Design", "Data Science", "Business")}
        data = [("Python for Beginners", "Programming", ins[0], "beginner"),
                ("Django REST Masterclass", "Programming", ins[0], "advanced"),
                ("UI/UX Fundamentals", "Design", ins[1], "beginner"),
                ("Intro to Machine Learning", "Data Science", ins[1], "intermediate"),
                ("Startup Basics", "Business", ins[1], "beginner")]
        courses = []
        for title, cat, inst, level in data:
            c, _ = Course.objects.get_or_create(title=title, defaults={
                "description": f"A hands-on course: {title}.", "category": cats[cat], "instructor": inst,
                "level": level, "duration_hours": 10})
            courses.append(c)
        for i, s in enumerate(studs):
            for c in courses[: (i % 4) + 1]:
                Enrollment.objects.get_or_create(student=s, course=c, defaults={"progress": (i * 20) % 100})
        self.stdout.write(self.style.SUCCESS("Demo data ready. Logins: admin@lms.test / ins1@lms.test / stu1@lms.test  pw: " + pw))
