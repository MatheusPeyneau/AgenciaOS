"""
Tests for new operational features:
- Collaborators CRUD
- Client-Collaborator assignments
- Operational Tasks (CRUD, template, reorder, time, comments)
- Operational Summary
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    if resp.status_code != 200:
        pytest.skip(f"Auth failed: {resp.status_code} {resp.text}")
    return resp.json().get("token")

@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def test_client_id(auth_headers):
    """Create a fresh test client for task testing"""
    resp = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
        "name": "TEST_TaskClient", "status": "ativo"
    })
    assert resp.status_code == 200
    return resp.json()["client_id"]

@pytest.fixture(scope="module")
def collab_id(auth_headers):
    """Create a test collaborator"""
    resp = requests.post(f"{BASE_URL}/api/collaborators", headers=auth_headers, json={
        "name": "TEST_Colaborador", "email": "test_collab@test.com", "role": "analyst"
    })
    assert resp.status_code == 200
    cid = resp.json()["collaborator_id"]
    yield cid
    # Cleanup: deactivate
    requests.delete(f"{BASE_URL}/api/collaborators/{cid}", headers=auth_headers)


# ============= COLLABORATORS =============

class TestCollaborators:
    def test_list_collaborators(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/collaborators", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print("PASS: list collaborators")

    def test_create_collaborator(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/collaborators", headers=auth_headers, json={
            "name": "TEST_Create Collab", "email": "create_collab@test.com", "role": "analyst"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Create Collab"
        assert data["role"] == "analyst"
        assert "collaborator_id" in data
        assert data["is_active"] == True
        # Cleanup
        requests.delete(f"{BASE_URL}/api/collaborators/{data['collaborator_id']}", headers=auth_headers)
        print("PASS: create collaborator")

    def test_update_collaborator(self, auth_headers, collab_id):
        resp = requests.patch(f"{BASE_URL}/api/collaborators/{collab_id}", headers=auth_headers, json={
            "name": "TEST_Updated Collab"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Updated Collab"
        print("PASS: update collaborator")

    def test_delete_collaborator_soft(self, auth_headers):
        # Create then soft-delete
        resp = requests.post(f"{BASE_URL}/api/collaborators", headers=auth_headers, json={
            "name": "TEST_ToDelete", "role": "analyst"
        })
        cid = resp.json()["collaborator_id"]
        del_resp = requests.delete(f"{BASE_URL}/api/collaborators/{cid}", headers=auth_headers)
        assert del_resp.status_code == 200
        assert "desativado" in del_resp.json().get("message", "").lower()
        # Verify not in active list
        list_resp = requests.get(f"{BASE_URL}/api/collaborators", headers=auth_headers)
        ids = [c["collaborator_id"] for c in list_resp.json()]
        assert cid not in ids
        print("PASS: soft delete collaborator")


# ============= CLIENT-COLLABORATOR =============

class TestClientCollaborators:
    def test_list_client_collaborators(self, auth_headers, test_client_id):
        resp = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/collaborators", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print("PASS: list client collaborators")

    def test_assign_collaborator(self, auth_headers, test_client_id, collab_id):
        resp = requests.post(f"{BASE_URL}/api/clients/{test_client_id}/collaborators", headers=auth_headers, json={
            "collaborator_id": collab_id, "role": "responsible"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["client_id"] == test_client_id
        assert data["collaborator_id"] == collab_id
        print("PASS: assign collaborator to client")

    def test_remove_collaborator_assignment(self, auth_headers, test_client_id, collab_id):
        # Ensure assigned first
        requests.post(f"{BASE_URL}/api/clients/{test_client_id}/collaborators", headers=auth_headers, json={
            "collaborator_id": collab_id, "role": "responsible"
        })
        resp = requests.delete(f"{BASE_URL}/api/clients/{test_client_id}/collaborators/{collab_id}", headers=auth_headers)
        assert resp.status_code == 200
        print("PASS: remove collaborator from client")


# ============= TASKS =============

class TestClientTasks:
    def test_list_tasks_empty(self, auth_headers, test_client_id):
        resp = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/tasks", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print("PASS: list tasks (empty)")

    def test_apply_template(self, auth_headers, test_client_id):
        resp = requests.post(f"{BASE_URL}/api/clients/{test_client_id}/tasks/apply-template", headers=auth_headers)
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) == 14
        print(f"PASS: apply template created {len(tasks)} tasks")

    def test_apply_template_fails_if_tasks_exist(self, auth_headers, test_client_id):
        resp = requests.post(f"{BASE_URL}/api/clients/{test_client_id}/tasks/apply-template", headers=auth_headers)
        assert resp.status_code == 400
        print("PASS: apply template fails when tasks already exist")

    def test_list_tasks_with_template(self, auth_headers, test_client_id):
        resp = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/tasks", headers=auth_headers)
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) == 14
        # Verify structure
        task = tasks[0]
        assert "task_id" in task
        assert "title" in task
        assert "status" in task
        assert "priority" in task
        print("PASS: list 14 template tasks with correct structure")

    def test_create_task(self, auth_headers, test_client_id):
        resp = requests.post(f"{BASE_URL}/api/clients/{test_client_id}/tasks", headers=auth_headers, json={
            "title": "TEST_Nova Tarefa"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "TEST_Nova Tarefa"
        assert data["status"] == "TO_DO"
        assert "task_id" in data
        print("PASS: create task")
        return data["task_id"]


class TestTaskManagement:
    @pytest.fixture(scope="class")
    def task_id(self, auth_headers, test_client_id):
        resp = requests.post(f"{BASE_URL}/api/clients/{test_client_id}/tasks", headers=auth_headers, json={
            "title": "TEST_Task For Management"
        })
        return resp.json()["task_id"]

    def test_update_task_status(self, auth_headers, task_id):
        resp = requests.patch(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers, json={
            "status": "IN_PROGRESS"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"
        print("PASS: update task status")

    def test_update_task_priority(self, auth_headers, task_id):
        resp = requests.patch(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers, json={
            "priority": "HIGH"
        })
        assert resp.status_code == 200
        assert resp.json()["priority"] == "HIGH"
        print("PASS: update task priority")

    def test_log_time(self, auth_headers, task_id):
        resp = requests.post(f"{BASE_URL}/api/tasks/{task_id}/time", headers=auth_headers, json={
            "minutes": 30, "note": "Test time log"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["minutes"] == 30
        assert data["tracked_minutes"] >= 30
        print("PASS: log time")

    def test_add_comment(self, auth_headers, task_id):
        resp = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=auth_headers, json={
            "content": "TEST_Comment"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "TEST_Comment"
        assert "comment_id" in data
        print("PASS: add comment")

    def test_list_comments(self, auth_headers, task_id):
        resp = requests.get(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        print("PASS: list comments")

    def test_reorder_tasks(self, auth_headers, test_client_id):
        tasks = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/tasks", headers=auth_headers).json()
        if len(tasks) < 2:
            pytest.skip("Not enough tasks to reorder")
        reorder_payload = {"tasks": [{"task_id": tasks[0]["task_id"], "position": 1}, {"task_id": tasks[1]["task_id"], "position": 0}]}
        resp = requests.patch(f"{BASE_URL}/api/tasks/reorder", headers=auth_headers, json=reorder_payload)
        assert resp.status_code == 200
        print("PASS: reorder tasks")

    def test_delete_task(self, auth_headers, task_id):
        resp = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "deleted_at" in data
        print("PASS: soft delete task")


# ============= OPERATIONAL SUMMARY =============

class TestOperationalSummary:
    def test_summary_returns_list(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/operational/summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "client" in item
            assert "task_summary" in item
            assert "responsible_collaborator" in item
            assert "services" in item
        print(f"PASS: operational summary returns {len(data)} items")

    def test_summary_filter_by_manager(self, auth_headers):
        # Filter by non-existent manager - should return empty
        resp = requests.get(f"{BASE_URL}/api/operational/summary?manager_id=nonexistent_id", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data == []
        print("PASS: filter by manager_id works")

    def test_summary_existing_client(self, auth_headers):
        # Use the known test client
        resp = requests.get(f"{BASE_URL}/api/operational/summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        client_ids = [item["client"]["client_id"] for item in data]
        assert "client_0a7adba7db" in client_ids, f"Known test client not found. Got: {client_ids[:3]}"
        # Check task_summary fields
        known = next(i for i in data if i["client"]["client_id"] == "client_0a7adba7db")
        ts = known["task_summary"]
        assert ts["total"] >= 14
        print(f"PASS: known test client in summary with {ts['total']} tasks")
