"""Create synthetic browser data and serve an isolated database on a dedicated port."""

import json
import os
from datetime import date, timedelta
from pathlib import Path
import sys
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.e2e_settings"
os.environ["DATABASE_URL"] = ""

import django
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from core.models import DailyAchivedMetrics, Metric, TrackedMetrics, UserLog
from healthHub.models import PlanDetail, UserCreation


def seed():
    expected = (PROJECT_ROOT / ".test-data" / "e2e.sqlite3").resolve()
    actual = Path(settings.DATABASES["default"]["NAME"]).resolve()
    if actual != expected or settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
        raise RuntimeError("Refusing to reset a database outside the dedicated E2E path")
    expected.parent.mkdir(parents=True, exist_ok=True)
    call_command("migrate", interactive=False, verbosity=0)
    call_command("flush", interactive=False, verbosity=0)
    User = get_user_model()
    password = "BrowserTest1!"
    owner = User.objects.create_user(username="e2e-owner", email="owner@example.test", password=password,
        birth_date=date(2000, 1, 1))
    reader = User.objects.create_user(username="e2e-reader", email="reader@example.test", password=password,
        birth_date=date(2000, 1, 1))

    def create(kind, name, creator=owner, **fields):
        return UserCreation.objects.create(creator=creator, type=kind, name=name, media=[], **fields).get_concrete()

    shared = create("recipe", "E2E Shared Recipe", creator=reader, category="Breakfast", shared=True,
        ingredients=[], directions=[])
    for index in range(30):
        create("recipe", f"E2E Oats {index:02}", category="Breakfast", ingredients=[], directions=[])
    recipe = create("recipe", "E2E Private Recipe", category="Dinner", ingredients=[],
        directions=[{"type": "p", "content": "Cook and serve", "effects": []}], serv=2)
    diet = create("plan", "E2E Diet Plan", category="diet", duration=timedelta(days=7))
    exercise = create("plan", "E2E Exercise Plan", category="exercise", duration=timedelta(days=7))
    full = create("plan", "E2E Full Plan", category="full", diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    for plan in (diet, exercise):
        root = PlanDetail.objects.create(plan=plan, section="Day 1", order=1)
        PlanDetail.objects.create(plan=plan, parent_section=root, section="Morning", order=1,
            detail=[{"type": "p", "content": "Complete today's routine", "effects": []}])
        UserLog.objects.create(user=owner, plan=plan, date=timezone.localdate())
    metric = Metric.objects.create(user=owner, name="Water", type="daily")
    tracker = TrackedMetrics.objects.create(metric=metric, target=2000, start=0, linkedPlan=diet)
    log = UserLog.objects.get(user=owner, plan=diet, date=timezone.localdate())
    DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=1000)
    data = {
        "owner": {"username": owner.username, "email": owner.email, "password": password},
        "reader": {"username": reader.username, "email": reader.email, "password": password},
        "recipe": {"id": recipe.pk, "name": recipe.base.name},
        "sharedRecipe": {"id": shared.pk, "name": shared.base.name},
        "diet": {"id": diet.pk, "name": diet.base.name},
        "exercise": {"id": exercise.pk, "name": exercise.base.name},
        "full": {"id": full.pk, "name": full.base.name},
        "today": timezone.localdate().isoformat(),
    }
    (expected.parent / "seed.json").write_text(json.dumps(data), encoding="utf-8")


def no_remote_service(*args, **kwargs):
    raise RuntimeError("External service disabled in the isolated E2E server")


if __name__ == "__main__":
    seed()
    port = int(os.environ.get("SMARTDIET_E2E_PORT", "8765"))
    with patch("requests.sessions.Session.request", no_remote_service), \
         patch("cloudinary.uploader.upload", no_remote_service), \
         patch("cloudinary.uploader.destroy", no_remote_service):
        call_command("runserver", f"127.0.0.1:{port}", use_reloader=False)
