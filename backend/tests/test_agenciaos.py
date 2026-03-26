"""
AgenciaOS - Backend API Tests
Testing: Leads/Pipeline, Pipeline Stages, Operational Cards, Content/Carousel, Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    # Register user
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "testuser@agenciaos.com",
        "password": "test123",
        "name": "Test User"
    })
    if r.status_code in [200, 201]:
        return r.json().get("token") or r.json().get("access_token")
    # Try login if already exists
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@agenciaos.com",
        "password": "test123"
    })
    assert r.status_code == 200, f"Auth failed: {r.text}"
    return r.json().get("token") or r.json().get("access_token")

@pytest.fixture(scope="module")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s

# ---- Feature 1: Leads + Pipeline ----

class TestLeadsAndPipeline:
    """Feature 1: Lead creation and add to pipeline"""
    
    def test_create_lead(self, client):
        r = client.post(f"{BASE_URL}/api/leads", json={
            "name": "TEST_Lead One",
            "email": "lead1@test.com",
            "company": "Test Corp",
            "phone": "11999999999"
        })
        assert r.status_code in [200, 201], f"Create lead failed: {r.text}"
        data = r.json()
        # API uses lead_id field
        lead_id = data.get("lead_id") or data.get("id") or data.get("_id")
        assert lead_id, f"No lead_id in response: {data}"
        TestLeadsAndPipeline.lead_id = lead_id
        print(f"Lead created: {TestLeadsAndPipeline.lead_id}")
    
    def test_get_leads(self, client):
        r = client.get(f"{BASE_URL}/api/leads")
        assert r.status_code == 200, f"Get leads failed: {r.text}"
        data = r.json()
        assert isinstance(data, list)
        print(f"Leads count: {len(data)}")
    
    def test_add_lead_to_pipeline(self, client):
        lead_id = getattr(TestLeadsAndPipeline, 'lead_id', None)
        if not lead_id:
            pytest.skip("No lead_id from previous test")
        r = client.get(f"{BASE_URL}/api/pipeline/stages")
        assert r.status_code == 200
        stages = r.json()
        assert len(stages) > 0
        stage_id = stages[0].get("stage_id")  # API uses stage_id field
        
        r = client.post(f"{BASE_URL}/api/leads/{lead_id}/pipeline", json={"stage_id": stage_id})
        assert r.status_code in [200, 201], f"Add to pipeline failed: {r.text}"
        print(f"Lead added to pipeline stage: {stage_id}")

# ---- Feature 2: Pipeline Stages ----

class TestPipelineStages:
    """Feature 2: Pipeline stage management"""
    
    def test_get_stages(self, client):
        r = client.get(f"{BASE_URL}/api/pipeline/stages")
        assert r.status_code == 200, f"Get stages failed: {r.text}"
        stages = r.json()
        assert isinstance(stages, list)
        assert len(stages) > 0
        TestPipelineStages.stages = stages
        print(f"Stages: {[s.get('name') for s in stages]}")
    
    def test_reorder_stages(self, client):
        stages = getattr(TestPipelineStages, 'stages', None)
        if not stages:
            pytest.skip("No stages from previous test")
        # API expects: {"stages": [{"stage_id": "...", "order": 0}, ...]}
        stage_items = [{"stage_id": s.get("stage_id"), "order": i} for i, s in enumerate(reversed(stages))]
        r = client.patch(f"{BASE_URL}/api/pipeline/stages/reorder", json={"stages": stage_items})
        assert r.status_code in [200, 201], f"Reorder failed: {r.text}"
        print("Stages reordered")
    
    def test_rename_stage(self, client):
        stages = getattr(TestPipelineStages, 'stages', None)
        if not stages:
            pytest.skip("No stages from previous test")
        stage_id = stages[0].get("stage_id")  # API uses stage_id field
        r = client.patch(f"{BASE_URL}/api/pipeline/stages/{stage_id}", json={"name": "TEST_Renamed Stage"})
        assert r.status_code in [200, 201], f"Rename failed: {r.text}"
        client.patch(f"{BASE_URL}/api/pipeline/stages/{stage_id}", json={"name": stages[0].get("name")})
        print("Stage renamed successfully")

# ---- Feature 3: Operational Cards ----

class TestOperational:
    """Feature 3: Operational cards per client"""
    
    def test_create_client_creates_operational_card(self, client):
        r = client.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Client Operacional",
            "email": "client@test.com",
            "industry": "Marketing"
        })
        assert r.status_code in [200, 201], f"Create client failed: {r.text}"
        data = r.json()
        TestOperational.client_id = data.get("client_id") or data.get("id") or data.get("_id")
        assert TestOperational.client_id, f"No client_id in response: {data}"
        print(f"Client created: {TestOperational.client_id}")
    
    def test_get_operational_no_500(self, client):
        """Critical: GET /api/operational must not return 500"""
        r = client.get(f"{BASE_URL}/api/operational")
        assert r.status_code == 200, f"Operational returned {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list)
        print(f"Operational cards count: {len(data)}")
        if len(data) > 0:
            card = data[0]
            print(f"Card keys: {list(card.keys())}")
    
    def test_operational_card_has_client_info(self, client):
        r = client.get(f"{BASE_URL}/api/operational")
        assert r.status_code == 200
        data = r.json()
        if len(data) > 0:
            card = data[0]
            assert "client_name" in card or "client" in card or "name" in card, \
                f"Card missing client info: {list(card.keys())}"
        print("Operational cards have client data")
    
    def test_toggle_operational_service(self, client):
        client_id = getattr(TestOperational, 'client_id', None)
        if not client_id:
            pytest.skip("No client_id from previous test")
        r = client.patch(f"{BASE_URL}/api/operational/{client_id}", json={
            "meta_ads": True,
            "google_ads": False,
            "auto_reports": True,
            "alerts": False
        })
        assert r.status_code in [200, 201], f"Toggle failed: {r.text}"
        print("Toggle operational service worked")

# ---- Feature 4: Content / Carousel ----

class TestContentCarousel:
    """Feature 4: Carousel generation via N8N webhook"""
    
    def test_get_carousel_webhook_setting(self, client):
        r = client.get(f"{BASE_URL}/api/settings/carousel-webhook")
        assert r.status_code == 200, f"Get webhook setting failed: {r.text}"
        data = r.json()
        print(f"Webhook setting: {data}")
    
    def test_put_carousel_webhook_setting(self, client):
        r = client.put(f"{BASE_URL}/api/settings/carousel-webhook", json={
            "webhook_url": "https://n8n.example.com/webhook/test"
        })
        assert r.status_code in [200, 201], f"Put webhook setting failed: {r.text}"
        print("Webhook URL updated")
        # Reset
        client.put(f"{BASE_URL}/api/settings/carousel-webhook", json={"webhook_url": ""})
    
    def test_generate_carousel_no_webhook_returns_400(self, client):
        """N8N webhook not configured - should return 400"""
        client.put(f"{BASE_URL}/api/settings/carousel-webhook", json={"webhook_url": ""})
        # Get a valid client_id
        clients_r = client.get(f"{BASE_URL}/api/clients")
        client_id = clients_r.json()[0].get("client_id") if clients_r.status_code == 200 and clients_r.json() else "invalid"
        r = client.post(f"{BASE_URL}/api/content/carousel/generate", json={
            "client_id": client_id,
            "topic": "test topic"
        })
        assert r.status_code in [400, 422], f"Expected 400 when webhook not set, got {r.status_code}: {r.text}"
        print(f"Correctly returned {r.status_code} when webhook not configured")
