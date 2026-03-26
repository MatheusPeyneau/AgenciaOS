from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import bcrypt
import jwt as pyjwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'agenciaos-jwt-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="AgênciaOS API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============= AUTH UTILITIES =============

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ============= REQUEST MODELS =============

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SessionRequest(BaseModel):
    session_id: str

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "manual"
    status: str = "novo"
    score: int = 50
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    notes: Optional[str] = None

class StageCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    order: int = 0

class DealCreate(BaseModel):
    title: str
    value: float = 0
    stage_id: str
    lead_id: Optional[str] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    probability: int = 50
    notes: Optional[str] = None

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage_id: Optional[str] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    probability: Optional[int] = None
    notes: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: str = "ativo"
    monthly_value: float = 0
    billing_type: str = "BOLETO"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: Optional[str] = None
    monthly_value: Optional[float] = None
    billing_type: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class WebhookSettings(BaseModel):
    webhook_url: str
    enabled: bool = True

class AIRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

class AddToPipelineRequest(BaseModel):
    stage_id: str

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class StageReorderItem(BaseModel):
    stage_id: str
    order: int

class StageReorderRequest(BaseModel):
    stages: List[StageReorderItem]

class OperationalCardUpdate(BaseModel):
    meta_ads: Optional[bool] = None
    google_ads: Optional[bool] = None
    auto_reports: Optional[bool] = None
    alerts: Optional[bool] = None

class CarouselWebhookSettings(BaseModel):
    webhook_url: str
    enabled: bool = True

class CarouselRequest(BaseModel):
    client_id: str


# ---- Collaborators ----

class CollaboratorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role: str = "analyst"
    avatar_url: Optional[str] = None

class CollaboratorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class ClientCollaboratorAssign(BaseModel):
    collaborator_id: str
    role: str = "responsible"

# ---- Operational Tasks ----

class TaskCreate(BaseModel):
    title: str
    status: str = "TO_DO"
    priority: str = "NORMAL"
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    is_recurring: bool = False
    recurring_rule: Optional[str] = None
    parent_task_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurring_rule: Optional[str] = None
    position: Optional[int] = None

class TaskReorderBatchItem(BaseModel):
    task_id: str
    position: int

class TaskBatchReorderRequest(BaseModel):
    tasks: List[TaskReorderBatchItem]

class TimeLogCreate(BaseModel):
    minutes: int
    note: Optional[str] = None

class TaskCommentCreate(BaseModel):
    content: str
    author_name: Optional[str] = None


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"

    user_doc = {
        "user_id": user_id,
        "name": body.name,
        "email": body.email,
        "password_hash": password_hash,
        "picture": None,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    token = create_jwt_token(user_id, body.email)
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    user_data = {k: v for k, v in user_doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_data}


@api_router.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_jwt_token(user["user_id"], user["email"])
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_data}


@api_router.post("/auth/session")
async def google_auth_session(body: SessionRequest, response: Response):
    """Exchange Emergent Auth session_id for our JWT token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
                timeout=10.0,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão inválida")
            data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Error calling Emergent Auth: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar sessão Google")

    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        user_data = {k: v for k, v in existing.items() if k not in ["_id", "password_hash"]}
        user_data.update({"name": name, "picture": picture})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "picture": picture,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user_data = {k: v for k, v in user_doc.items() if k != "_id"}

    token = create_jwt_token(user_id, email)
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    return {"token": token, "user": user_data}


@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password_hash"}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"message": "Logout realizado com sucesso"}


# ============= LEADS ENDPOINTS =============

@api_router.get("/leads")
async def list_leads(current_user: dict = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads


@api_router.post("/leads")
async def create_lead(body: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_id = f"lead_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead_doc)
    return {k: v for k, v in lead_doc.items() if k != "_id"}


@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return lead


@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"lead_id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"message": "Lead removido com sucesso"}


# ============= PIPELINE ENDPOINTS =============

@api_router.get("/pipeline/stages")
async def list_stages(current_user: dict = Depends(get_current_user)):
    stages = await db.pipeline_stages.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return stages


@api_router.post("/pipeline/stages")
async def create_stage(body: StageCreate, current_user: dict = Depends(get_current_user)):
    stage_id = f"stage_{uuid.uuid4().hex[:10]}"
    stage_doc = {
        "stage_id": stage_id,
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pipeline_stages.insert_one(stage_doc)
    return {k: v for k, v in stage_doc.items() if k != "_id"}


@api_router.get("/pipeline/deals")
async def list_deals(current_user: dict = Depends(get_current_user)):
    filter_q = {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}
    deals = await db.deals.find(filter_q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return deals


@api_router.post("/pipeline/deals")
async def create_deal(body: DealCreate, current_user: dict = Depends(get_current_user)):
    deal_id = f"deal_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    deal_doc = {
        "deal_id": deal_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.deals.insert_one(deal_doc)
    return {k: v for k, v in deal_doc.items() if k != "_id"}


@api_router.put("/pipeline/deals/{deal_id}")
async def update_deal(deal_id: str, body: DealUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.deals.update_one({"deal_id": deal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    return await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})


@api_router.delete("/pipeline/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    return {"deleted_at": now, "deal_id": deal_id}


# ============= WEBHOOK HELPER =============

async def send_n8n_webhook(client_doc: dict):
    """Fire N8N webhook when a new client is created, if configured and enabled."""
    try:
        settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
        if not settings or not settings.get("enabled") or not settings.get("webhook_url"):
            return
        # Compute due_date: use client value or default to 1st day of next month
        if client_doc.get("due_date"):
            due_date_str = client_doc["due_date"]
        else:
            now = datetime.now(timezone.utc)
            month = now.month % 12 + 1
            year = now.year + (1 if now.month == 12 else 0)
            due_date_str = f"{year}-{month:02d}-01"

        payload = {
            "name": client_doc.get("name", ""),
            "cpfCnpj": client_doc.get("cpf_cnpj", ""),
            "email": client_doc.get("email", ""),
            "mobilePhone": client_doc.get("phone", ""),
            "billingType": client_doc.get("billing_type", "BOLETO"),
            "value": client_doc.get("monthly_value", 0),
            "dueDate": due_date_str,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(settings["webhook_url"], json=payload, timeout=10.0)
            logger.info(f"N8N webhook dispatched → {resp.status_code}")
    except Exception as exc:
        logger.error(f"N8N webhook error: {exc}")  # never breaks client creation


async def call_n8n_with_retry(url: str, payload: dict, retries: int = 3, timeout: float = 30.0):
    """Call N8N webhook with exponential backoff retry."""
    last_error = "desconhecido"
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=timeout)
                if resp.status_code < 500:
                    try:
                        return resp.json()
                    except Exception:
                        return {"raw_response": resp.text, "status_code": resp.status_code}
            last_error = f"HTTP {resp.status_code}"
        except httpx.TimeoutException:
            last_error = "timeout (30s)"
        except httpx.RequestError as exc:
            last_error = str(exc)
        if attempt < retries - 1:
            await asyncio.sleep((attempt + 1) * 1.5)
    raise HTTPException(
        status_code=504,
        detail=f"N8N não respondeu após {retries} tentativas. Erro: {last_error}",
    )


# ============= CLIENTS ENDPOINTS =============

@api_router.get("/clients")
async def list_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return clients


@api_router.post("/clients")
async def create_client(body: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = f"client_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    client_doc = {
        "client_id": client_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.clients.insert_one(client_doc)
    # Auto-create operational card (atomic within same request)
    op_card_id = f"opcard_{uuid.uuid4().hex[:10]}"
    await db.operational_cards.insert_one({
        "op_card_id": op_card_id,
        "client_id": client_id,
        "meta_ads": False,
        "google_ads": False,
        "auto_reports": False,
        "alerts": False,
        "created_at": now,
        "updated_at": now,
    })
    result = {k: v for k, v in client_doc.items() if k != "_id"}
    await send_n8n_webhook(client_doc)
    return result


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client


@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, body: ClientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.clients.update_one({"client_id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return await db.clients.find_one({"client_id": client_id}, {"_id": 0})


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente removido com sucesso"}


# ============= WEBHOOK SETTINGS ENDPOINTS =============

@api_router.get("/settings/webhook")
async def get_webhook_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": False}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", False)}


@api_router.put("/settings/webhook")
async def save_webhook_settings(body: WebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_n8n"},
        {
            "$set": {
                "setting_id": "webhook_n8n",
                "webhook_url": body.webhook_url,
                "enabled": body.enabled,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {"message": "Webhook salvo com sucesso", "webhook_url": body.webhook_url, "enabled": body.enabled}


@api_router.post("/settings/webhook/test")
async def test_webhook(current_user: dict = Depends(get_current_user)):
    """Send a test payload to the configured N8N webhook."""
    settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
    if not settings or not settings.get("webhook_url"):
        raise HTTPException(status_code=400, detail="Webhook não configurado. Salve a URL primeiro.")

    now = datetime.now(timezone.utc)
    month = now.month % 12 + 1
    year = now.year + (1 if now.month == 12 else 0)
    test_payload = {
        "name": "Cliente Teste AgênciaOS",
        "cpfCnpj": "00000000000000",
        "email": "teste@agenciaos.com",
        "mobilePhone": "11999999999",
        "billingType": "BOLETO",
        "value": 500.00,
        "dueDate": f"{year}-{month:02d}-01",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(settings["webhook_url"], json=test_payload, timeout=10.0)
            return {"status": "success", "status_code": resp.status_code, "message": f"Payload enviado com sucesso (HTTP {resp.status_code})"}
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout: o N8N não respondeu em 10s")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {str(exc)}")


# ============= FEATURE 1: LEAD → PIPELINE =============

@api_router.post("/leads/{lead_id}/pipeline")
async def add_lead_to_pipeline(lead_id: str, body: AddToPipelineRequest, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    # Check if already in active pipeline
    active_filter = {
        "lead_id": lead_id,
        "$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}],
    }
    existing = await db.deals.find_one(active_filter, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Lead já está em um pipeline ativo")

    stage = await db.pipeline_stages.find_one({"stage_id": body.stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")

    deal_id = f"deal_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    deal_doc = {
        "deal_id": deal_id,
        "title": lead["name"],
        "value": 0,
        "stage_id": body.stage_id,
        "lead_id": lead_id,
        "contact_name": lead["name"],
        "company": lead.get("company", ""),
        "probability": 50,
        "notes": "",
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.deals.insert_one(deal_doc)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": "em_atendimento", "updated_at": now}},
    )
    result = {k: v for k, v in deal_doc.items() if k != "_id"}
    result["stage"] = stage
    return result


# ============= FEATURE 2: STAGE MANAGEMENT =============

@api_router.patch("/pipeline/stages/reorder")
async def reorder_stages(body: StageReorderRequest, current_user: dict = Depends(get_current_user)):
    for item in body.stages:
        await db.pipeline_stages.update_one(
            {"stage_id": item.stage_id},
            {"$set": {"order": item.order}},
        )
    return {"message": "Etapas reordenadas com sucesso"}


@api_router.patch("/pipeline/stages/{stage_id}")
async def update_stage(stage_id: str, body: StageUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    result = await db.pipeline_stages.update_one({"stage_id": stage_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    return await db.pipeline_stages.find_one({"stage_id": stage_id}, {"_id": 0})


# ============= FEATURE 3: OPERATIONAL CARDS =============

@api_router.get("/operational")
async def list_operational(current_user: dict = Depends(get_current_user)):
    pipeline_q = [
        {"$project": {"_id": 0}},
        {"$lookup": {
            "from": "clients",
            "localField": "client_id",
            "foreignField": "client_id",
            "as": "client_list",
        }},
        {"$addFields": {
            "client": {"$ifNull": [{"$first": "$client_list"}, {}]}
        }},
        {"$project": {
            "client_list": 0,
            "client._id": 0,
        }},
    ]
    result = await db.operational_cards.aggregate(pipeline_q).to_list(500)
    return result


@api_router.patch("/operational/{client_id}")
async def update_operational(client_id: str, body: OperationalCardUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.operational_cards.update_one(
        {"client_id": client_id},
        {"$set": update_data},
        upsert=True,
    )
    return await db.operational_cards.find_one({"client_id": client_id}, {"_id": 0})


# ============= FEATURE 4: CAROUSEL GENERATION =============

@api_router.get("/settings/carousel-webhook")
async def get_carousel_webhook(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_carousel"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": False}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", False)}


@api_router.put("/settings/carousel-webhook")
async def save_carousel_webhook(body: CarouselWebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_carousel"},
        {"$set": {
            "setting_id": "webhook_carousel",
            "webhook_url": body.webhook_url,
            "enabled": body.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"message": "Webhook de carrossel salvo", "webhook_url": body.webhook_url, "enabled": body.enabled}


@api_router.post("/content/carousel/generate")
async def generate_carousel(body: CarouselRequest, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    settings = await db.settings.find_one({"setting_id": "webhook_carousel"}, {"_id": 0})
    if not settings or not settings.get("webhook_url"):
        raise HTTPException(
            status_code=400,
            detail="Webhook de carrossel não configurado. Acesse Configurações > N8N > Webhook de Carrossel.",
        )
    if not settings.get("enabled"):
        raise HTTPException(status_code=400, detail="Webhook de carrossel está desativado nas configurações.")

    if not client.get("notes", "").strip():
        raise HTTPException(
            status_code=422,
            detail="Cliente sem notas cadastradas. Adicione informações do nicho nas Notas do cliente.",
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    payload = {
        "jobId": job_id,
        "clientId": client["client_id"],
        "clientName": client["name"],
        "niche": client.get("company", ""),
        "notes": client.get("notes", ""),
        "email": client.get("email", ""),
        "requestedAt": datetime.now(timezone.utc).isoformat(),
    }

    log_id = f"log_{uuid.uuid4().hex[:10]}"
    await db.content_generation_logs.insert_one({
        "log_id": log_id,
        "job_id": job_id,
        "client_id": body.client_id,
        "status": "pending",
        "payload": payload,
        "response": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        result = await call_n8n_with_retry(settings["webhook_url"], payload)
        await db.content_generation_logs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "success", "response": result}},
        )
        return {"job_id": job_id, "status": "success", "data": result}
    except HTTPException as exc:
        await db.content_generation_logs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "response": {"error": exc.detail}}},
        )
        raise


# ============= COLLABORATORS =============

@api_router.get("/collaborators")
async def list_collaborators(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    q: Dict[str, Any] = {"is_active": True}
    if role:
        q["role"] = role
    collaborators = await db.collaborators.find(q, {"_id": 0}).sort("name", 1).to_list(200)
    return collaborators


@api_router.post("/collaborators")
async def create_collaborator(body: CollaboratorCreate, current_user: dict = Depends(get_current_user)):
    collab_id = f"collab_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {"collaborator_id": collab_id, **body.model_dump(), "is_active": True, "created_at": now}
    await db.collaborators.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.patch("/collaborators/{collaborator_id}")
async def update_collaborator(collaborator_id: str, body: CollaboratorUpdate, current_user: dict = Depends(get_current_user)):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    result = await db.collaborators.update_one({"collaborator_id": collaborator_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return await db.collaborators.find_one({"collaborator_id": collaborator_id}, {"_id": 0})


@api_router.delete("/collaborators/{collaborator_id}")
async def deactivate_collaborator(collaborator_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.collaborators.update_one(
        {"collaborator_id": collaborator_id}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return {"message": "Colaborador desativado"}


# ============= CLIENT-COLLABORATOR ASSIGNMENTS =============

@api_router.get("/clients/{client_id}/collaborators")
async def get_client_collaborators(client_id: str, current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"client_id": client_id}},
        {"$project": {"_id": 0}},
        {"$lookup": {"from": "collaborators", "localField": "collaborator_id", "foreignField": "collaborator_id", "as": "collab_list"}},
        {"$addFields": {"collaborator": {"$ifNull": [{"$first": "$collab_list"}, {}]}}},
        {"$project": {"collab_list": 0, "collaborator._id": 0}},
    ]
    return await db.client_collaborators.aggregate(pipeline).to_list(50)


@api_router.post("/clients/{client_id}/collaborators")
async def assign_collaborator_to_client(client_id: str, body: ClientCollaboratorAssign, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    collab = await db.collaborators.find_one({"collaborator_id": body.collaborator_id, "is_active": True}, {"_id": 0})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    now = datetime.now(timezone.utc).isoformat()
    await db.client_collaborators.update_one(
        {"client_id": client_id, "collaborator_id": body.collaborator_id},
        {"$set": {"client_id": client_id, "collaborator_id": body.collaborator_id, "role": body.role, "assigned_at": now}},
        upsert=True,
    )
    return {"client_id": client_id, "collaborator_id": body.collaborator_id, "role": body.role, "collaborator": collab}


@api_router.delete("/clients/{client_id}/collaborators/{collaborator_id}")
async def remove_collaborator_from_client(client_id: str, collaborator_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.client_collaborators.delete_one({"client_id": client_id, "collaborator_id": collaborator_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    return {"message": "Atribuição removida"}


# ============= OPERATIONAL TASKS =============

def _active_task_filter():
    return {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}


@api_router.post("/clients/{client_id}/tasks/apply-template")
async def apply_task_template(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    existing = await db.operational_tasks.count_documents({"client_id": client_id, **_active_task_filter()})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Este cliente já possui tarefas. Limpe antes de aplicar o template.")

    DEFAULT_TEMPLATE = [
        {"title": "Criar grupo de Whatsapp com o Cliente", "priority": "URGENT", "estimated_minutes": 2},
        {"title": "Dados para Contrato", "priority": "URGENT", "estimated_minutes": 5},
        {"title": "Elaborar e Assinar Contrato", "priority": "HIGH", "estimated_minutes": 10},
        {"title": "Cadastrar Asaas", "priority": "NORMAL", "estimated_minutes": 5},
        {"title": "Agendar Cobranças", "priority": "NORMAL", "estimated_minutes": 7},
        {"title": "Briefing", "priority": "HIGH", "estimated_minutes": 40},
        {"title": "Estruturação de Campanhas", "priority": "HIGH", "estimated_minutes": 80},
        {"title": "Validação de Campanhas", "priority": "HIGH", "estimated_minutes": 8},
        {"title": "Enviar Campanhas para Aprovação", "priority": "HIGH", "estimated_minutes": 8},
        {"title": "Follow-up", "priority": "NORMAL", "estimated_minutes": 15},
        {"title": "Otimizações", "priority": "HIGH", "estimated_minutes": 30},
        {"title": "Otimizações/Verificações semanais", "priority": "HIGH", "estimated_minutes": 20, "is_recurring": True, "recurring_rule": "weekly"},
        {"title": "Envio de Mensagem no grupo para Relatório", "priority": "NORMAL", "estimated_minutes": 2, "is_recurring": True, "recurring_rule": "monthly"},
        {"title": "DIÁRIO", "priority": "NORMAL", "estimated_minutes": 20, "is_recurring": True, "recurring_rule": "daily"},
    ]
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, tmpl in enumerate(DEFAULT_TEMPLATE):
        task_id = f"task_{uuid.uuid4().hex[:10]}"
        docs.append({
            "task_id": task_id, "client_id": client_id, "parent_task_id": None,
            "title": tmpl["title"], "status": "TO_DO", "priority": tmpl["priority"],
            "assignee_id": None, "start_date": None, "due_date": None,
            "estimated_minutes": tmpl.get("estimated_minutes"), "tracked_minutes": 0,
            "position": i, "is_recurring": tmpl.get("is_recurring", False),
            "recurring_rule": tmpl.get("recurring_rule"), "comment_count": 0,
            "deleted_at": None, "created_at": now, "updated_at": now,
        })
    await db.operational_tasks.insert_many(docs)
    return [{k: v for k, v in d.items() if k != "_id"} for d in docs]


@api_router.get("/clients/{client_id}/tasks")
async def list_client_tasks(
    client_id: str,
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
    priority: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    q_parts: List[Dict] = [{"client_id": client_id}, _active_task_filter()]
    if parent_task_id is not None:
        q_parts.append({"parent_task_id": parent_task_id})
    else:
        q_parts.append({"$or": [{"parent_task_id": {"$exists": False}}, {"parent_task_id": None}]})
    if status:
        q_parts.append({"status": status})
    if assignee_id:
        q_parts.append({"assignee_id": assignee_id})
    if priority:
        q_parts.append({"priority": priority})

    tasks = await db.operational_tasks.find({"$and": q_parts}, {"_id": 0}).sort("position", 1).to_list(500)
    if not tasks:
        return []

    assignee_ids = list({t["assignee_id"] for t in tasks if t.get("assignee_id")})
    collab_map: Dict[str, Any] = {}
    if assignee_ids:
        collabs = await db.collaborators.find({"collaborator_id": {"$in": assignee_ids}}, {"_id": 0}).to_list(100)
        collab_map = {c["collaborator_id"]: c for c in collabs}

    task_ids = [t["task_id"] for t in tasks]
    subtask_pipeline = [
        {"$match": {"parent_task_id": {"$in": task_ids}, **_active_task_filter()}},
        {"$group": {"_id": "$parent_task_id", "count": {"$sum": 1}, "completed": {"$sum": {"$cond": [{"$eq": ["$status", "DONE"]}, 1, 0]}}}},
    ]
    subtask_agg = await db.operational_tasks.aggregate(subtask_pipeline).to_list(1000)
    subtask_map = {s["_id"]: s for s in subtask_agg}

    for task in tasks:
        task["assignee"] = collab_map.get(task.get("assignee_id"))
        sc = subtask_map.get(task["task_id"], {"count": 0, "completed": 0})
        task["subtask_count"] = sc["count"]
        task["completed_subtasks"] = sc["completed"]

    return tasks


@api_router.post("/clients/{client_id}/tasks")
async def create_client_task(client_id: str, body: TaskCreate, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    last_task = await db.operational_tasks.find_one(
        {"client_id": client_id, "parent_task_id": body.parent_task_id},
        {"_id": 0, "position": 1}, sort=[("position", -1)],
    )
    position = (last_task["position"] + 1) if last_task else 0
    task_id = f"task_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "task_id": task_id, "client_id": client_id, "parent_task_id": body.parent_task_id,
        "title": body.title, "status": body.status, "priority": body.priority,
        "assignee_id": body.assignee_id, "start_date": body.start_date, "due_date": body.due_date,
        "estimated_minutes": body.estimated_minutes, "tracked_minutes": 0, "position": position,
        "is_recurring": body.is_recurring, "recurring_rule": body.recurring_rule,
        "comment_count": 0, "deleted_at": None, "created_at": now, "updated_at": now,
    }
    await db.operational_tasks.insert_one(doc)
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["assignee"] = None
    result["subtask_count"] = 0
    result["completed_subtasks"] = 0
    return result


# ============= TASK MANAGEMENT =============

@api_router.patch("/tasks/reorder")
async def reorder_tasks(body: TaskBatchReorderRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    for item in body.tasks:
        await db.operational_tasks.update_one(
            {"task_id": item.task_id},
            {"$set": {"position": item.position, "updated_at": now}},
        )
    return {"message": "Tarefas reordenadas com sucesso"}


@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, current_user: dict = Depends(get_current_user)):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    if update_data.get("status") == "DONE":
        update_data["completed_at"] = now
    elif "status" in update_data and update_data["status"] != "DONE":
        update_data["completed_at"] = None
    result = await db.operational_tasks.update_one(
        {"task_id": task_id, **_active_task_filter()}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if task:
        task["assignee"] = (
            await db.collaborators.find_one({"collaborator_id": task["assignee_id"]}, {"_id": 0})
            if task.get("assignee_id") else None
        )
    return task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.operational_tasks.update_one(
        {"task_id": task_id}, {"$set": {"deleted_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return {"deleted_at": now, "task_id": task_id}


@api_router.post("/tasks/{task_id}/time")
async def log_time(task_id: str, body: TimeLogCreate, current_user: dict = Depends(get_current_user)):
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    if body.minutes <= 0:
        raise HTTPException(status_code=400, detail="Minutos deve ser positivo")
    log_id = f"timelog_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.task_time_logs.insert_one({
        "log_id": log_id, "task_id": task_id, "collaborator_id": None,
        "minutes": body.minutes, "note": body.note, "logged_at": now,
    })
    new_tracked = (task.get("tracked_minutes") or 0) + body.minutes
    await db.operational_tasks.update_one(
        {"task_id": task_id}, {"$set": {"tracked_minutes": new_tracked, "updated_at": now}}
    )
    return {"log_id": log_id, "task_id": task_id, "minutes": body.minutes, "tracked_minutes": new_tracked}


@api_router.get("/tasks/{task_id}/comments")
async def list_comments(task_id: str, current_user: dict = Depends(get_current_user)):
    return await db.task_comments.find({"task_id": task_id}, {"_id": 0}).sort("created_at", 1).to_list(200)


@api_router.post("/tasks/{task_id}/comments")
async def add_comment(task_id: str, body: TaskCommentCreate, current_user: dict = Depends(get_current_user)):
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    comment_id = f"comment_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "comment_id": comment_id, "task_id": task_id,
        "author_id": current_user["user_id"],
        "author_name": body.author_name or current_user.get("name", "Usuário"),
        "content": body.content, "created_at": now,
    }
    await db.task_comments.insert_one(doc)
    await db.operational_tasks.update_one({"task_id": task_id}, {"$inc": {"comment_count": 1}})
    return {k: v for k, v in doc.items() if k != "_id"}


# ============= OPERATIONAL SUMMARY =============

@api_router.get("/operational/summary")
async def get_operational_summary(manager_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find({"status": "ativo"}, {"_id": 0}).to_list(500)
    if not clients:
        return []
    client_ids = [c["client_id"] for c in clients]
    now_iso = datetime.now(timezone.utc).isoformat()

    task_pipeline = [
        {"$match": {"client_id": {"$in": client_ids}, **_active_task_filter()}},
        {"$group": {
            "_id": "$client_id",
            "total": {"$sum": 1},
            "done": {"$sum": {"$cond": [{"$eq": ["$status", "DONE"]}, 1, 0]}},
            "todo": {"$sum": {"$cond": [{"$eq": ["$status", "TO_DO"]}, 1, 0]}},
            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "IN_PROGRESS"]}, 1, 0]}},
            "overdue": {"$sum": {"$cond": [
                {"$and": [
                    {"$not": [{"$in": ["$status", ["DONE", "CANCELLED"]]}]},
                    {"$ne": ["$due_date", None]}, {"$lt": ["$due_date", now_iso]},
                ]}, 1, 0,
            ]}},
        }},
    ]
    task_agg = await db.operational_tasks.aggregate(task_pipeline).to_list(1000)
    task_map = {t["_id"]: t for t in task_agg}

    cc_pipeline = [
        {"$match": {"client_id": {"$in": client_ids}, "role": "responsible"}},
        {"$project": {"_id": 0}},
        {"$lookup": {"from": "collaborators", "localField": "collaborator_id", "foreignField": "collaborator_id", "as": "collab_list"}},
        {"$addFields": {"collaborator": {"$ifNull": [{"$first": "$collab_list"}, None]}}},
        {"$project": {"collab_list": 0, "collaborator._id": 0}},
    ]
    cc_data = await db.client_collaborators.aggregate(cc_pipeline).to_list(1000)
    cc_map = {cc["client_id"]: cc for cc in cc_data}

    op_cards = await db.operational_cards.find({"client_id": {"$in": client_ids}}, {"_id": 0}).to_list(500)
    op_map = {o["client_id"]: o for o in op_cards}

    result = []
    for client in clients:
        cid = client["client_id"]
        cc = cc_map.get(cid)
        responsible = cc["collaborator"] if cc and cc.get("collaborator") else None
        if manager_id:
            if not responsible or responsible.get("collaborator_id") != manager_id:
                continue
        task_info = task_map.get(cid, {"total": 0, "done": 0, "todo": 0, "in_progress": 0, "overdue": 0})
        op = op_map.get(cid, {})
        result.append({
            "client": client, "responsible_collaborator": responsible,
            "task_summary": {
                "total": task_info.get("total", 0), "done": task_info.get("done", 0),
                "todo": task_info.get("todo", 0), "in_progress": task_info.get("in_progress", 0),
                "overdue": task_info.get("overdue", 0),
            },
            "services": {
                "meta_ads": op.get("meta_ads", False), "google_ads": op.get("google_ads", False),
                "auto_reports": op.get("auto_reports", False), "alerts": op.get("alerts", False),
            },
        })
    return result


# ============= DASHBOARD ENDPOINTS =============

@api_router.get("/dashboard/kpis")
async def get_dashboard_kpis(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    total_leads = await db.leads.count_documents({})
    leads_this_month = await db.leads.count_documents({"created_at": {"$gte": month_start}})
    total_deals = await db.deals.count_documents({})

    won_stage = await db.pipeline_stages.find_one({"name": {"$regex": "ganho", "$options": "i"}}, {"_id": 0})
    won_stage_id = won_stage["stage_id"] if won_stage else "stage_ganho01"
    won_deals = await db.deals.count_documents({"stage_id": won_stage_id})

    pipeline_cursor = db.deals.aggregate([{"$group": {"_id": None, "total": {"$sum": "$value"}}}])
    pipeline_result = await pipeline_cursor.to_list(1)
    pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0

    active_clients = await db.clients.count_documents({"status": "ativo"})
    mrr_cursor = db.clients.aggregate([
        {"$match": {"status": "ativo"}},
        {"$group": {"_id": None, "total": {"$sum": "$monthly_value"}}},
    ])
    mrr_result = await mrr_cursor.to_list(1)
    mrr = mrr_result[0]["total"] if mrr_result else 0

    conversion_rate = round((won_deals / total_deals * 100) if total_deals > 0 else 0, 1)

    stages = await db.pipeline_stages.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    deals_all = await db.deals.find({}, {"_id": 0}).to_list(500)

    deals_by_stage = []
    for stage in stages:
        stage_deals = [d for d in deals_all if d.get("stage_id") == stage["stage_id"]]
        deals_by_stage.append({
            "stage": stage["name"],
            "count": len(stage_deals),
            "value": sum(d.get("value", 0) for d in stage_deals),
            "color": stage.get("color", "#3B82F6"),
        })

    recent_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(8)

    return {
        "total_leads": total_leads,
        "leads_this_month": leads_this_month,
        "pipeline_value": pipeline_value,
        "active_clients": active_clients,
        "mrr": mrr,
        "conversion_rate": conversion_rate,
        "total_deals": total_deals,
        "won_deals": won_deals,
        "deals_by_stage": deals_by_stage,
        "recent_leads": recent_leads,
    }


# ============= AI ENDPOINTS (Pre-configured) =============

@api_router.post("/ai/qualify-lead")
async def qualify_lead(body: AIRequest, current_user: dict = Depends(get_current_user)):
    """Pre-configured AI endpoint for lead qualification using Anthropic/Gemini"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return {"qualification": "IA não configurada. Configure EMERGENT_LLM_KEY.", "score": 50}

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"qualify_{uuid.uuid4().hex[:8]}",
            system_message=(
                "Você é um especialista em qualificação de leads para agências de marketing digital. "
                "Analise as informações do lead e forneça: 1) Score de 0-100, 2) Potencial do lead, "
                "3) Próximos passos recomendados. Responda sempre em português brasileiro."
            ),
        )
        prompt = f"Qualifique este lead: {body.prompt}"
        if body.context:
            prompt += f"\n\nContexto adicional: {body.context}"
        response = await chat.send_message(UserMessage(content=prompt))
        return {"qualification": response, "status": "success"}
    except Exception as e:
        logger.error(f"AI qualification error: {e}")
        return {"qualification": "Erro ao processar com IA", "error": str(e)}


@api_router.post("/ai/generate-content")
async def generate_content(body: AIRequest, current_user: dict = Depends(get_current_user)):
    """Pre-configured AI endpoint for content generation using Anthropic/Gemini"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return {"content": "IA não configurada. Configure EMERGENT_LLM_KEY.", "status": "not_configured"}

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"content_{uuid.uuid4().hex[:8]}",
            system_message=(
                "Você é um especialista em marketing de conteúdo para redes sociais brasileiras. "
                "Crie conteúdo criativo, engajante e alinhado com as tendências do mercado. "
                "Responda sempre em português brasileiro."
            ),
        )
        response = await chat.send_message(UserMessage(content=body.prompt))
        return {"content": response, "status": "success"}
    except Exception as e:
        logger.error(f"AI content error: {e}")
        return {"content": "Erro ao gerar conteúdo", "error": str(e)}


# ============= STARTUP / SHUTDOWN =============

@app.on_event("startup")
async def startup_event():
    count = await db.pipeline_stages.count_documents({})
    if count == 0:
        default_stages = [
            {"stage_id": "stage_prosp01", "name": "Prospecção", "color": "#6366F1", "order": 0},
            {"stage_id": "stage_qualif01", "name": "Qualificação", "color": "#3B82F6", "order": 1},
            {"stage_id": "stage_propos01", "name": "Proposta", "color": "#F59E0B", "order": 2},
            {"stage_id": "stage_negoc01", "name": "Negociação", "color": "#EF4444", "order": 3},
            {"stage_id": "stage_ganho01", "name": "Fechado Ganho", "color": "#10B981", "order": 4},
            {"stage_id": "stage_perdi01", "name": "Fechado Perdido", "color": "#6B7280", "order": 5},
        ]
        await db.pipeline_stages.insert_many(default_stages)
        logger.info("Pipeline stages seeded successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    db_client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
