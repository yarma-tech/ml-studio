import pytest

def test_upload_csv(client, sample_csv):
    with open(sample_csv, "rb") as f:
        response = client.post("/api/datasets/upload", files={"file": ("sample.csv", f, "text/csv")})
    assert response.status_code == 200
    data = response.json()
    assert "dataset_id" in data
    assert data["rows"] == 5
    assert data["columns"] == 4
    assert "age" in data["column_names"]

def test_upload_invalid_format(client, tmp_path):
    path = tmp_path / "test.txt"
    path.write_text("hello")
    with open(path, "rb") as f:
        response = client.post("/api/datasets/upload", files={"file": ("test.txt", f, "text/plain")})
    assert response.status_code == 400

def test_preview(client, sample_csv):
    with open(sample_csv, "rb") as f:
        upload = client.post("/api/datasets/upload", files={"file": ("sample.csv", f, "text/csv")})
    dataset_id = upload.json()["dataset_id"]
    response = client.get(f"/api/datasets/{dataset_id}/preview")
    assert response.status_code == 200
    data = response.json()
    assert len(data["rows"]) == 5
    assert data["rows"][0]["age"] == 25

def test_stats(client, sample_csv):
    with open(sample_csv, "rb") as f:
        upload = client.post("/api/datasets/upload", files={"file": ("sample.csv", f, "text/csv")})
    dataset_id = upload.json()["dataset_id"]
    response = client.get(f"/api/datasets/{dataset_id}/stats")
    assert response.status_code == 200
    stats = response.json()["columns"]
    age_stat = next(s for s in stats if s["name"] == "age")
    assert age_stat["dtype"] == "numeric"
    assert age_stat["missing"] == 0

def test_distribution(client, sample_csv):
    with open(sample_csv, "rb") as f:
        upload = client.post("/api/datasets/upload", files={"file": ("sample.csv", f, "text/csv")})
    dataset_id = upload.json()["dataset_id"]
    response = client.get(f"/api/datasets/{dataset_id}/distribution/city")
    assert response.status_code == 200
    data = response.json()
    assert data["dtype"] == "categorical"
    assert len(data["bins"]) > 0
