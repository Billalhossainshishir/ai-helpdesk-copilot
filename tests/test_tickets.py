def sample_ticket():
    return {
        "name": "Demo User",
        "email": "demo@example.com",
        "title": "Wi-Fi keeps disconnecting",
        "description": "The laptop disconnects from Wi-Fi every few minutes while I am working.",
        "device_type": "Windows laptop",
        "category": "Network",
        "priority": "High",
    }


def test_ticket_creation_succeeds(client):
    response = client.post("/tickets", json=sample_ticket())
    assert response.status_code == 201
    body = response.json()
    assert body["ticket_number"].startswith("HD-")
    assert body["status"] == "Open"
    assert body["priority"] == "High"


def test_invalid_ticket_is_rejected(client):
    bad = sample_ticket()
    bad["email"] = "not-an-email"
    response = client.post("/tickets", json=bad)
    assert response.status_code == 422


def test_ticket_status_update_persists(client):
    created = client.post("/tickets", json=sample_ticket()).json()
    response = client.patch(
        f"/tickets/{created['id']}",
        json={"status": "In Progress", "assigned_to": "Technician One"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"

    fetched = client.get(f"/tickets/{created['id']}")
    assert fetched.json()["assigned_to"] == "Technician One"


def test_resolving_sets_resolved_at(client):
    created = client.post("/tickets", json=sample_ticket()).json()
    response = client.post(
        f"/tickets/{created['id']}/resolve",
        json={"resolution": "Updated the Wi-Fi driver and reset the adapter.", "resolved_by": "Tech Demo"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Resolved"
    assert body["resolved_at"] is not None
    assert body["resolution"] is not None


def test_analytics_returns_expected_fields(client):
    client.post("/tickets", json=sample_ticket())
    response = client.get("/analytics")
    assert response.status_code == 200
    body = response.json()
    expected = {
        "total_tickets",
        "open_tickets",
        "in_progress_tickets",
        "waiting_tickets",
        "resolved_tickets",
        "closed_tickets",
        "critical_tickets",
        "resolved_today",
        "average_resolution_minutes",
    }
    assert expected.issubset(body.keys())
    assert body["total_tickets"] == 1
