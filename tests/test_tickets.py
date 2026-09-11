def sample_ticket(include_ai_fields=True):
    ticket = {
        "name": "Demo User",
        "email": "demo@example.com",
        "title": "Wi-Fi keeps disconnecting",
        "description": "The laptop disconnects from Wi-Fi every few minutes while I am working.",
        "device_type": "Windows laptop",
    }
    if include_ai_fields:
        ticket.update({"category": "Network", "priority": "High"})
    return ticket


def test_ticket_creation_succeeds(client):
    response = client.post("/tickets", json=sample_ticket())
    assert response.status_code == 201
    body = response.json()
    assert body["ticket_number"].startswith("HD-")
    assert body["status"] == "Open"
    assert body["priority"] == "High"


def test_ticket_creation_can_auto_triage(client):
    response = client.post("/tickets", json=sample_ticket(include_ai_fields=False))
    assert response.status_code == 201
    body = response.json()
    assert body["category"] == "Network"
    assert body["priority"] in {"Medium", "High"}


def test_invalid_ticket_is_rejected(client):
    bad = sample_ticket()
    bad["email"] = "not-an-email"
    response = client.post("/tickets", json=bad)
    assert response.status_code == 422


def test_ticket_status_update_persists(client):
    created = client.post("/tickets", json=sample_ticket()).json()
    response = client.patch(f"/tickets/{created['id']}", json={"status": "In Progress", "assigned_to": "Technician One"})
    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"
    assert client.get(f"/tickets/{created['id']}").json()["assigned_to"] == "Technician One"


def test_internal_note_round_trip(client):
    created = client.post("/tickets", json=sample_ticket()).json()
    response = client.post(f"/tickets/{created['id']}/notes", json={"author": "Tech One", "note": "Asked user to reconnect to Wi-Fi."})
    assert response.status_code == 201
    notes = client.get(f"/tickets/{created['id']}/notes").json()
    assert len(notes) == 1
    assert notes[0]["author"] == "Tech One"


def test_resolving_sets_resolved_at(client):
    created = client.post("/tickets", json=sample_ticket()).json()
    response = client.post(f"/tickets/{created['id']}/resolve", json={"resolution": "Updated the Wi-Fi driver and reset the adapter.", "resolved_by": "Tech Demo"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Resolved"
    assert body["resolved_at"] is not None
    assert body["resolution"] is not None


def test_similar_incident_search_returns_resolved_ticket(client):
    resolved = client.post("/tickets", json=sample_ticket()).json()
    client.post(f"/tickets/{resolved['id']}/resolve", json={"resolution": "Reinstalled the wireless driver and renewed DHCP.", "resolved_by": "Tech"})
    current = sample_ticket()
    current["email"] = "second@example.com"
    current["title"] = "Wireless keeps dropping"
    current["description"] = "Wi-Fi drops every few minutes during calls on my laptop."
    created = client.post("/tickets", json=current).json()
    response = client.get(f"/tickets/{created['id']}/similar")
    assert response.status_code == 200
    assert response.json()
    assert response.json()[0]["ticket_id"] == resolved["id"]


def test_analytics_returns_expanded_fields(client):
    client.post("/tickets", json=sample_ticket())
    response = client.get("/analytics")
    assert response.status_code == 200
    body = response.json()
    expected = {"total_tickets","open_tickets","critical_tickets","resolution_percentage","most_common_category","top_recurring_problem","by_status","by_priority","by_category","tickets_per_day"}
    assert expected.issubset(body.keys())
    assert body["total_tickets"] == 1


def test_custom_requester_identity_round_trip_and_list(client):
    payload = sample_ticket()
    payload["name"] = "BILLAL HOSSAIN SHISHIR"
    payload["email"] = "shishir73ahmed@gmail.com"
    created = client.post("/tickets", json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == payload["name"]
    assert body["email"] == payload["email"]

    listed = client.get("/tickets?limit=500")
    assert listed.status_code == 200
    assert any(
        ticket["id"] == body["id"]
        and ticket["name"] == payload["name"]
        and ticket["email"] == payload["email"]
        for ticket in listed.json()
    )


def test_legacy_invalid_demo_email_cannot_break_ticket_list(client):
    from backend.app import models
    from backend.app.database import SessionLocal

    with SessionLocal() as db:
        legacy = models.Ticket(
            ticket_number="DEMO-9999",
            name="Legacy Demo",
            email="legacy@demo.helpdesk.local",
            title="Legacy demo ticket",
            description="This legacy demo row should still be serializable by the dashboard.",
            device_type="Windows laptop",
            category="Other",
            priority="Medium",
            status="Open",
        )
        db.add(legacy)
        db.commit()

    response = client.get("/tickets?limit=500")
    assert response.status_code == 200
    assert any(ticket["email"] == "legacy@demo.helpdesk.local" for ticket in response.json())


def test_demo_seed_is_idempotent_and_repairs_old_email(client):
    from backend.app import models
    from backend.app.database import SessionLocal
    from backend.app.demo_data import seed_demo_tickets
    from sqlalchemy import select

    with SessionLocal() as db:
        old = models.Ticket(
            ticket_number="DEMO-0001",
            name="Ava Demo",
            email="ava@demo.helpdesk.local",
            title="Wi-Fi keeps disconnecting",
            description="Legacy seeded demo ticket with an old invalid local email domain.",
            device_type="Windows laptop",
            category="Network",
            priority="High",
            status="Open",
        )
        db.add(old)
        db.commit()

        added_first = seed_demo_tickets(db)
        added_second = seed_demo_tickets(db)
        tickets = list(db.scalars(select(models.Ticket).where(models.Ticket.ticket_number.like("DEMO-%"))).all())
        repaired = db.scalar(select(models.Ticket).where(models.Ticket.ticket_number == "DEMO-0001"))

    assert added_first == 4
    assert added_second == 0
    assert len(tickets) == 5
    assert repaired.email == "ava.demo@example.com"


def test_reset_demo_preserves_real_user_tickets(client):
    from backend.app.database import SessionLocal
    from backend.app.demo_data import reset_demo_tickets, seed_demo_tickets

    created = client.post("/tickets", json=sample_ticket()).json()
    with SessionLocal() as db:
        seed_demo_tickets(db)
        reset_demo_tickets(db)
        seed_demo_tickets(db)

    response = client.get("/tickets?limit=500")
    assert response.status_code == 200
    tickets = response.json()
    assert any(ticket["id"] == created["id"] for ticket in tickets)
    assert len([ticket for ticket in tickets if ticket["ticket_number"].startswith("DEMO-")]) == 5
