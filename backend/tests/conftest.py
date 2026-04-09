import pytest
import csv
from fastapi.testclient import TestClient

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_csv(tmp_path):
    path = tmp_path / "sample.csv"
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["age", "salary", "city", "purchased"])
        writer.writerow([25, 35000, "Paris", "Yes"])
        writer.writerow([42, 58000, "Lyon", "No"])
        writer.writerow([31, 42000, "Paris", "Yes"])
        writer.writerow([22, 28000, "Marseille", "No"])
        writer.writerow([35, 52000, "Lyon", "Yes"])
    return path
