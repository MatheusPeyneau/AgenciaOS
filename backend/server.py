from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
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
    status: str = "ativo"
    monthly_value: float = 0
    start_date: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    monthly_value: Optional[float] = None
    start_date: Optional[str] = None
    notes: Optional[str] = None

class AIRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None


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
    deals = await db.deals.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
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
    result = await db.deals.delete_one({"deal_id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    return {"message": "Deal removido com sucesso"}


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
    return {k: v for k, v in client_doc.items() if k != "_id"}


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
