def test_customer_portal_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Report IT Problem" in response.text
    assert "Analyse issue" in response.text


def test_technician_dashboard_is_served(client):
    response = client.get("/technician")
    assert response.status_code == 200
    assert "Technician Dashboard" in response.text
    assert "Support tickets" in response.text


def test_frontend_styles_are_served(client):
    response = client.get("/static/css/styles.css")
    assert response.status_code == 200
    assert "text/css" in response.headers["content-type"]


def test_customer_javascript_uses_analysis_and_ticket_api(client):
    response = client.get("/static/js/app.js")
    assert response.status_code == 200
    assert "fetch(\"/analyse-issue\"" in response.text
    assert "fetch(\"/tickets\"" in response.text


def test_technician_javascript_is_served(client):
    response = client.get("/static/js/technician.js")
    assert response.status_code == 200
    assert "/analytics" in response.text
    assert "/similar" in response.text


def test_customer_portal_has_personalised_requester_chat(client):
    response = client.get("/")
    assert response.status_code == 200
    assert 'id="chatUserName"' in response.text
    assert 'id="chatUserEmail"' in response.text
    assert 'id="receiptRequester"' in response.text
    assert 'id="receiptEmail"' in response.text


def test_customer_javascript_renders_requester_identity(client):
    response = client.get("/static/js/app.js")
    assert response.status_code == 200
    assert "chatUserName" in response.text
    assert "chatUserEmail" in response.text
    assert "data.name" in response.text


def test_customer_submission_notifies_open_technician_dashboard(client):
    response = client.get("/static/js/app.js")
    assert response.status_code == 200
    assert 'BroadcastChannel("helpdesk-events")' in response.text
    assert "helpdesk:lastTicketCreated" in response.text


def test_technician_dashboard_live_refresh_and_partial_failure_resilience(client):
    response = client.get("/static/js/technician.js")
    assert response.status_code == 200
    assert "Promise.allSettled" in response.text
    assert "setInterval" in response.text
    assert 'BroadcastChannel("helpdesk-events")' in response.text
    assert "t.name" in response.text
    assert "t.email" in response.text
