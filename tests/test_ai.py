def issue(title="Wi-Fi keeps disconnecting", description="My laptop disconnects from Wi-Fi every few minutes while I am working."):
    return {"title": title, "description": description, "device_type": "Windows laptop"}


def test_category_prediction_returns_supported_category(client):
    response = client.post("/predict-category", json=issue())
    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "Network"
    assert 0 <= body["confidence"] <= 1
    assert "TF-IDF" in body["model"]


def test_critical_security_priority_rule(client):
    payload = issue(
        "Ransomware message appeared",
        "A ransomware note appeared and files may be encrypted. This is affecting all users.",
    )
    response = client.post("/predict-priority", json=payload)
    assert response.status_code == 200
    assert response.json()["priority"] == "Critical"
    assert response.json()["reasons"]


def test_knowledge_retrieval_returns_top_three(client):
    response = client.post("/suggest-solution", json=issue())
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert all("solution" in item for item in body)
    assert body[0]["category"] == "Network"


def test_full_analysis_combines_model_rules_and_retrieval(client):
    response = client.post("/analyse-issue", json=issue())
    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "Network"
    assert body["priority"] in {"Low", "Medium", "High", "Critical"}
    assert len(body["suggestions"]) == 3
