from fastapi.testclient import TestClient

from main import app


def test_localhost_preflight_from_127_is_allowed():
    origin = "http://127.0.0.1:3000"
    client = TestClient(app)

    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type,x-finsight-mode",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_localhost_preflight_on_alternate_dev_port_is_allowed():
    origin = "http://localhost:3001"
    client = TestClient(app)

    response = client.options(
        "/trade-history?limit=20",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type,x-finsight-mode",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
