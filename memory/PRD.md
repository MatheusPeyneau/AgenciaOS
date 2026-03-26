# AgênciaOS - PRD (Product Requirements Document)

## Visão Geral
Plataforma SaaS de automação para agências de marketing digital brasileiras.
Permite gerenciar toda a operação: Comercial, Entrega, Operacional, Conteúdo, Financeiro e RH.

**Criado em:** Janeiro 2026
**Stack:** FastAPI + React + MongoDB + TailwindCSS + Shadcn/UI

---

## Decisões de Arquitetura
- **Backend:** FastAPI (Python) + Motor (async MongoDB) — substituiu NestJS para compatibilidade com o ambiente
- **Frontend:** React (CRA) + React Router v7 + Shadcn/UI — substituiu Next.js
- **DB:** MongoDB — substituiu PostgreSQL/Prisma
- **Auth:** JWT customizado + Google OAuth via Emergent Auth
- **IA:** Emergent LLM Key (Anthropic Claude + Gemini) via `emergentintegrations`
- **Kanban:** @dnd-kit/core para drag-and-drop
- **Charts:** Recharts
- **Tema:** Outfit (headings) + Plus Jakarta Sans (body), Light/Dark mode

---

## Personas
- **Donos de agência:** precisam de visão executiva (KPIs, MRR, conversão)
- **Gestores comerciais:** trabalham com leads e pipeline de vendas
- **Gestores de conta:** gerenciam clientes e projetos
- **Equipe de conteúdo:** produzem e agendam posts

---

## O Que Foi Implementado (v1.0 - Janeiro 2026)

### Backend (FastAPI)
- [x] Auth: Registro, Login (JWT), Google OAuth (Emergent), /me, Logout
- [x] Leads CRUD: Criar, listar, editar, deletar leads com score e status
- [x] Pipeline: 6 etapas pré-configuradas (Prospecção → Fechado Ganho), CRUD de deals
- [x] Clientes CRUD: Gestão de clientes com MRR por cliente
- [x] Dashboard KPIs: total_leads, pipeline_value, mrr, active_clients, conversion_rate, deals_by_stage
- [x] IA endpoints (pré-configurados): /ai/qualify-lead e /ai/generate-content
- [x] Seed automático das etapas do pipeline no startup

### Frontend (React)
- [x] Login page: Email/senha + Google OAuth, tab Registro
- [x] AuthCallback: Processa session_id do OAuth e redireciona
- [x] ProtectedRoute: Redireciona para /login se não autenticado
- [x] Layout: Sidebar fixo + Header com user menu + theme toggle
- [x] Dashboard: 4 KPI cards + gráfico de barras por etapa + leads recentes
- [x] Módulo Comercial - Leads: Tabela completa, busca, filtros, modal criar/editar
- [x] Módulo Comercial - Pipeline: Kanban com drag-and-drop (@dnd-kit)
- [x] Clientes: Tabela, filtros, modal criar/editar, total MRR
- [x] Stubs: Financeiro, Conteúdo, Operacional, RH (com "Em desenvolvimento")
- [x] Configurações: Perfil, tema, integrações pré-configuradas
- [x] Dark/Light mode completo

---

## Backlog Priorizado

### P0 - Crítico (próxima sprint)
- [ ] Módulo Financeiro: faturas, cobranças recorrentes (Stripe)
- [ ] Módulo de Conteúdo: calendário editorial + IA (geração de posts via Claude)
- [ ] Detalhes do Lead: página individual com histórico e timeline
- [ ] Notificações in-app (leads novos, deals movidos)

### P1 - Importante
- [ ] Módulo Operacional: integração Meta Ads / Google Ads via API
- [ ] Módulo RH: cadastro de colaboradores + RBAC
- [ ] Automações (Zapier-like): triggers + actions + workflows
- [ ] Relatórios mensais automatizados por cliente
- [ ] Busca global (Command+K)
- [ ] Paginação nas tabelas de Leads e Clientes

### P2 - Desejável
- [ ] Onboarding wizard para novos usuários
- [ ] Integração WhatsApp (via API)
- [ ] Integração Google Calendar (agendamentos)
- [ ] Score automático de leads via IA
- [ ] Multi-workspace (multi-tenant por agência)
- [ ] Exportação CSV / relatórios PDF

---

## Variáveis de Ambiente

### Backend (.env)
- MONGO_URL: MongoDB connection string
- DB_NAME: Database name
- JWT_SECRET: Chave secreta JWT
- EMERGENT_LLM_KEY: Chave IA (Anthropic/Gemini via Emergent)
- CORS_ORIGINS: Origens permitidas

### Frontend (.env)
- REACT_APP_BACKEND_URL: URL do backend

---

## Endpoints da API

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/session (Google OAuth)
- GET /api/auth/me
- POST /api/auth/logout

### Leads
- GET/POST /api/leads
- GET/PUT/DELETE /api/leads/{lead_id}

### Pipeline
- GET/POST /api/pipeline/stages
- GET/POST /api/pipeline/deals
- PUT/DELETE /api/pipeline/deals/{deal_id}

### Clientes
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/{client_id}

### Dashboard
- GET /api/dashboard/kpis

### IA (pré-configurado)
- POST /api/ai/qualify-lead
- POST /api/ai/generate-content
