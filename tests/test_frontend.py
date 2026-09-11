def test_customer_portal_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Report IT Problem" in response.text
    assert "AI Helpdesk Copilot" in response.text


def test_frontend_styles_are_served(client):
    response = client.get("/static/css/styles.css")
    assert response.status_code == 200
    assert "text/css" in response.headers["content-type"]


def test_frontend_javascript_is_served(client):
    response = client.get("/static/js/app.js")
    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]
    assert "fetch(\"/tickets\"" in response.text
