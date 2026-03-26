"""AgênciaOS Backend API Tests - Auth, Leads, Pipeline, Clients, Dashboard"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test_backend_agent@agenciaos.com"
TEST_PASSWORD = "senha123test"
ADMIN_EMAIL = "admin@agenciaos.com"
ADMIN_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def admin_token():
    """Get token for existing admin user"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ============= AUTH TESTS =============

class TestAuth:
    """Authentication flow tests"""

    def test_register_new_user(self):
        # Use unique email each run
        import time
        email = f"test_reg_{int(time.time())}@agenciaos.com"
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST_Register User",
            "email": email,
            "password": "senha123test"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email

    def test_register_duplicate_email(self):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate", "email": ADMIN_EMAIL, "password": "senha123"
        })
        assert resp.status_code == 400

    def test_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == ADMIN_EMAIL

    def test_login_invalid_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_me_authenticated(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401

    def test_logout(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
        assert resp.status_code == 200


# ============= LEADS TESTS =============

class TestLeads:
    """Leads CRUD tests"""

    created_lead_id = None

    def test_list_leads_authenticated(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_leads_unauthenticated(self):
        resp = requests.get(f"{BASE_URL}/api/leads")
        assert resp.status_code == 401

    def test_create_lead(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_Lead Backend",
            "email": "test_lead@agenciaos.com",
            "company": "TEST_Company",
            "source": "instagram",
            "status": "novo",
            "score": 75
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Lead Backend"
        assert "lead_id" in data
        TestLeads.created_lead_id = data["lead_id"]

    def test_get_lead(self, auth_headers):
        assert TestLeads.created_lead_id, "No lead created yet"
        resp = requests.get(f"{BASE_URL}/api/leads/{TestLeads.created_lead_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["lead_id"] == TestLeads.created_lead_id

    def test_update_lead(self, auth_headers):
        assert TestLeads.created_lead_id
        resp = requests.put(f"{BASE_URL}/api/leads/{TestLeads.created_lead_id}", headers=auth_headers, json={
            "status": "qualificado", "score": 90
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "qualificado"
        assert data["score"] == 90

    def test_delete_lead(self, auth_headers):
        assert TestLeads.created_lead_id
        resp = requests.delete(f"{BASE_URL}/api/leads/{TestLeads.created_lead_id}", headers=auth_headers)
        assert resp.status_code == 200
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/leads/{TestLeads.created_lead_id}", headers=auth_headers)
        assert get_resp.status_code == 404


# ============= PIPELINE TESTS =============

class TestPipeline:
    """Pipeline stages and deals tests"""

    created_deal_id = None

    def test_list_stages(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=auth_headers)
        assert resp.status_code == 200
        stages = resp.json()
        assert len(stages) >= 6  # Seeded stages

    def test_list_deals(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/pipeline/deals", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_deal(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/pipeline/deals", headers=auth_headers, json={
            "title": "TEST_Deal Backend",
            "value": 5000.0,
            "stage_id": "stage_prosp01",
            "contact_name": "TEST_Contact",
            "probability": 60
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "TEST_Deal Backend"
        assert "deal_id" in data
        TestPipeline.created_deal_id = data["deal_id"]

    def test_update_deal_stage(self, auth_headers):
        assert TestPipeline.created_deal_id
        resp = requests.put(f"{BASE_URL}/api/pipeline/deals/{TestPipeline.created_deal_id}", headers=auth_headers, json={
            "stage_id": "stage_qualif01"
        })
        assert resp.status_code == 200
        assert resp.json()["stage_id"] == "stage_qualif01"

    def test_delete_deal(self, auth_headers):
        assert TestPipeline.created_deal_id
        resp = requests.delete(f"{BASE_URL}/api/pipeline/deals/{TestPipeline.created_deal_id}", headers=auth_headers)
        assert resp.status_code == 200


# ============= CLIENTS TESTS =============

class TestClients:
    """Clients CRUD tests"""

    created_client_id = None

    def test_list_clients(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_client(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "name": "TEST_Client Backend",
            "email": "client_test@agenciaos.com",
            "company": "TEST_Corp",
            "status": "ativo",
            "monthly_value": 3000.0
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Client Backend"
        assert "client_id" in data
        TestClients.created_client_id = data["client_id"]

    def test_get_client(self, auth_headers):
        assert TestClients.created_client_id
        resp = requests.get(f"{BASE_URL}/api/clients/{TestClients.created_client_id}", headers=auth_headers)
        assert resp.status_code == 200

    def test_update_client(self, auth_headers):
        assert TestClients.created_client_id
        resp = requests.put(f"{BASE_URL}/api/clients/{TestClients.created_client_id}", headers=auth_headers, json={
            "monthly_value": 5000.0, "status": "ativo"
        })
        assert resp.status_code == 200
        assert resp.json()["monthly_value"] == 5000.0

    def test_delete_client(self, auth_headers):
        assert TestClients.created_client_id
        resp = requests.delete(f"{BASE_URL}/api/clients/{TestClients.created_client_id}", headers=auth_headers)
        assert resp.status_code == 200
        get_resp = requests.get(f"{BASE_URL}/api/clients/{TestClients.created_client_id}", headers=auth_headers)
        assert get_resp.status_code == 404


# ============= DASHBOARD TESTS =============

class TestDashboard:
    """Dashboard KPI tests"""

    def test_get_kpis(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_leads" in data
        assert "pipeline_value" in data
        assert "active_clients" in data
        assert "mrr" in data
        assert "conversion_rate" in data
        assert "deals_by_stage" in data

    def test_kpis_unauthenticated(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert resp.status_code == 401
