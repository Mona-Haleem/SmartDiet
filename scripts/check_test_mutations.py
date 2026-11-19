"""Check that focused regressions detect four seeded faults in an isolated copy."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid


def main():
    root = Path(__file__).resolve().parents[1]
    sandbox = (root / ".test-data" / ("mutation-check-" + uuid.uuid4().hex)).resolve()
    assert sandbox.is_relative_to(root / ".test-data")
    sandbox.mkdir(parents=True)
    for name in ("config", "core", "healthHub", "users", "progress", "tests", "templates"):
        shutil.copytree(root / name, sandbox / name, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    for name in ("conftest.py", "pytest.ini", ".coveragerc", "manage.py"):
        shutil.copy2(root / name, sandbox / name)
    with (sandbox / "conftest.py").open("a", encoding="utf-8") as fixtures:
        fixtures.write('''\n\n@pytest.fixture(autouse=True, scope="session")
def mutation_source_guard():
    from pathlib import Path
    import core.models
    import users.views
    import healthHub.views
    expected_root = Path(__file__).resolve().parent
    for module in (core.models, users.views, healthHub.views):
        assert Path(module.__file__).resolve().is_relative_to(expected_root), "Mutation tests imported the original workspace"
''')
    (sandbox / "static").mkdir()
    environment = dict(os.environ)
    environment.pop("SMARTDIET_TEST_POSTGRES_PORT", None)
    environment["DJANGO_SETTINGS_MODULE"] = "config.test_settings"
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    environment["PYTHONPATH"] = str(sandbox)
    cases = [
        ("invert-category-credit", "core/models.py", "return float((self.value in targets) == positive)",
         "return float((self.value in targets) != positive)", "tests/unit/test_metric_scores.py", "category"),
        ("restore-truncated-scale-range", "core/models.py", "(value - 1) / 4 if positive else (5 - value) / 4",
         "value / 5 if positive else 1 - value / 5", "tests/unit/test_metric_scores.py", "scale"),
        ("remove-restriction-owner-check", "users/views.py", "get_object_or_404(UserRestriction, id=id, user=request.user)",
         "get_object_or_404(UserRestriction, id=id)", "tests/integration/test_permissions.py", "restriction_mutations_enforce_owner"),
        ("remove-media-owner-check", "healthHub/views.py", "get_object_or_404(UserCreation, id=id, creator=request.user, type=type)",
         "get_object_or_404(UserCreation, id=id, type=type)", "tests/integration/test_permissions.py", "media_mutations_reject_foreign_owner"),
    ]
    results = []
    for name, filename, before, after, test_file, expression in cases:
        path = sandbox / filename
        original = path.read_text(encoding="utf-8")
        if before not in original:
            raise RuntimeError(f"Mutation target changed: {name}")
        command = [sys.executable, "-m", "pytest", "--confcutdir=.", "-o", "django_find_project=false", test_file, "-k", expression, "-q", "--tb=line", "--show-capture=no"]
        baseline = subprocess.run(command, cwd=sandbox, env=environment, capture_output=True, text=True, timeout=60)
        (sandbox / f"{name}-baseline.log").write_text(baseline.stdout + baseline.stderr, encoding="utf-8")
        if baseline.returncode:
            raise RuntimeError(f"Baseline must pass before mutation: {name}; see {sandbox}")
        try:
            path.write_text(original.replace(before, after), encoding="utf-8")
            changed = subprocess.run(command, cwd=sandbox, env=environment, capture_output=True, text=True, timeout=60)
            (sandbox / f"{name}-mutant.log").write_text(changed.stdout + changed.stderr, encoding="utf-8")
            # pytest status 1 means assertion failures. Collection/setup failures
            # or an empty selection must never count as detecting a mutation.
            detected = changed.returncode == 1 and " failed" in changed.stdout and " error" not in changed.stdout.lower()
            results.append({"mutation": name, "detected": detected, "exit_code": changed.returncode})
            print(name, "DETECTED" if detected else "NOT DETECTED", flush=True)
        finally:
            path.write_text(original, encoding="utf-8")
    report = root / "coverage" / "mutation-smoke.json"
    report.parent.mkdir(exist_ok=True)
    report.write_text(json.dumps({"scope": "four seeded faults; not a full mutation score", "results": results,
                                  "logs": str(sandbox)}, indent=2), encoding="utf-8")
    return 0 if all(result["detected"] for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
