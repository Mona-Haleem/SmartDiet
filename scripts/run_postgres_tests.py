"""Run concurrency tests in a disposable, loopback-only PostgreSQL cluster."""
import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bin-dir", type=Path, help="Directory containing initdb, pg_ctl and createdb")
    args, pytest_args = parser.parse_known_args()
    root = Path(__file__).resolve().parents[1]
    binaries = args.bin_dir or Path(shutil.which("pg_ctl") or "").parent
    suffix = ".exe" if os.name == "nt" else ""
    executables = {name: binaries / (name + suffix) for name in ("initdb", "pg_ctl", "createdb")}
    if not all(path.is_file() for path in executables.values()):
        parser.error("Install PostgreSQL binaries or provide --bin-dir")
    cluster = (root / ".test-data" / ("postgres-tests-" + uuid.uuid4().hex)).resolve()
    if not cluster.is_relative_to(root / ".test-data"):
        raise RuntimeError("Test cluster must stay inside .test-data")
    cluster.mkdir(parents=True)
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    environment = {**os.environ, "SMARTDIET_TEST_POSTGRES_PORT": str(port),
                   "SMARTDIET_TEST_POSTGRES_PASSWORD": "", "DJANGO_SETTINGS_MODULE": "config.test_settings"}

    def pg(name, *command):
        subprocess.run([str(executables[name]), *map(str, command)], cwd=root, check=True, timeout=60)

    pg("initdb", "-D", cluster, "-U", "smartdiet_tests", "-A", "trust", "-E", "UTF8", "--no-locale")
    started = False
    try:
        pg("pg_ctl", "-D", cluster, "-l", cluster / "server.log", "-o", f"-p {port} -h 127.0.0.1", "-w", "start")
        started = True
        pg("createdb", "-h", "127.0.0.1", "-p", port, "-U", "smartdiet_tests", "smartdiet_tests")
        print(f"Isolated PostgreSQL test server: 127.0.0.1:{port}; logs: {cluster}", flush=True)
        command = pytest_args or ["tests/integration/test_postgres_concurrency.py", "-q", "--tb=line", "--show-capture=no", "--junitxml=coverage/postgres.xml"]
        return subprocess.run([sys.executable, "-m", "pytest", *command], cwd=root, env=environment).returncode
    finally:
        if started:
            pg("pg_ctl", "-D", cluster, "-m", "fast", "-w", "stop")


if __name__ == "__main__":
    raise SystemExit(main())
