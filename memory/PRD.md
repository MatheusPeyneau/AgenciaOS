# AgênciaOS - PRD (Product Requirements Document)

## Visão Geral
Plataforma SaaS de automação para agências de marketing digital brasileiras.
Permite gerenciar toda a operação: Comercial, Entrega, Operacional, Conteúdo, Financeiro e RH.

**Criado em:** Janeiro 2026
**Última atualização:** Fevereiro 2026
**Stack:** FastAPI + React + MongoDB + TailwindCSS + Shadcn/UI

---

## Decisões de Arquitetura
- **Backend:** FastAPI (Python) + Motor (async MongoDB)
- **Frontend:** React (CRA) + React Router v7 + Shadcn/UI
- **DB:** MongoDB — substituiu PostgreSQL/Prisma (ambiente sandbox)
- **Auth:** JWT customizado + Google OAuth via Emergent Auth
- **IA:** Emergent LLM Key (Anthropic Claude + Gemini) via `emergentintegrations`
- **Kanban:** @dnd-kit/core para drag-and-drop
- **Charts:** Recharts
- **Integrações:** N8N (webhooks configuráveis)

---

## Personas
- **Donos de agência:** precisam de visão executiva (KPIs, MRR, conversão)
- **Gestores comerciais:** trabalham com leads e pipeline de vendas
- **Gestores de conta:** gerenciam clientes e projetos
- **Equipe de conteúdo:** produzem e agendam posts

---

## O Que Foi Implementado

### v1.0 - Base (Janeiro 2026)
- [x] Auth: Registro, Login (JWT), Google OAuth (Emergent), /me, Logout
- [x] Leads CRUD: Criar, listar, editar, deletar leads com score e status
- [x] Pipeline: 6 etapas pré-configuradas (Prospecção → Fechado Perdido), CRUD de deals
- [x] Clientes CRUD: Gestão de clientes com MRR por cliente, CPF/CNPJ, billing_type
- [x] Dashboard KPIs: total_leads, pipeline_value, mrr, active_clients, conversion_rate, deals_by_stage
- [x] IA endpoints: /ai/qualify-lead e /ai/generate-content
- [x] Webhook N8N: GET/PUT /api/settings/webhook + POST /api/settings/webhook/test
- [x] Disparo automático ao N8N ao criar cliente (payload compatível com Asaas)
- [x] Seed automático das etapas do pipeline no startup

### v1.1 - Prompt Avançado (Fevereiro 2026) ✅ TESTADO 100%
- [x] **Feature 1:** Botão "Adicionar ao Pipeline" dentro do modal de criação de Lead (step 2 pós-criação)
  - Endpoint: POST /api/leads/{lead_id}/pipeline
- [x] **Feature 2:** Edição do Pipeline completa
  - Drag-and-drop para reordenar etapas (PATCH /api/pipeline/stages/reorder)
  - Renomear etapas (PATCH /api/pipeline/stages/{stage_id})
  - Soft delete de deals com "Desfazer" (5s) via toast
- [x] **Feature 3:** Card Operacional por Cliente
  - Criado automaticamente ao cadastrar cliente
  - Toggles: Meta Ads, Google Ads, Relatórios Auto, Alertas
  - Endpoint: GET /api/operational, PATCH /api/operational/{client_id}
  - Bug ObjectId serialization MongoDB corrigido
- [x] **Feature 4:** Geração de Carrossel via N8N
  - Webhook configurável em Configurações
  - Envio de dados do cliente (nicho, notas) para N8N
  - Exibição dos slides retornados com grid visual
  - Endpoints: GET/PUT /api/settings/carousel-webhook, POST /api/content/carousel/generate
  - Retry automático (3x com backoff exponencial)

---

## Arquitetura de Arquivos
```
/app/
├── backend/
│   ├── server.py              # FastAPI monolith (~918 linhas) - todos os endpoints
│   ├── tests/
│   │   └── test_agenciaos.py  # 13 testes pytest (100% pass)
│   └── .env                   # MONGO_URL, DB_NAME, JWT_SECRET, EMERGENT_LLM_KEY
├── frontend/
│   ├── src/
│   │   ├── components/        # Sidebar, Layout, Auth components
│   │   ├── components/ui/     # Shadcn components
│   │   ├── context/           # AuthContext
│   │   ├── pages/
│   │   │   ├── comercial/     # Leads.jsx, Pipeline.jsx
│   │   │   ├── clientes/      # Clientes.jsx
│   │   │   ├── operacional/   # Operacional.jsx
│   │   │   ├── conteudo/      # Conteudo.jsx
│   │   │   ├── financeiro/    # Financeiro.jsx (stub)
│   │   │   ├── rh/            # RH.jsx (stub)
│   │   │   ├── dashboard/     # Dashboard.jsx
│   │   │   └── configuracoes/ # Configuracoes.jsx
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
└── memory/
    └── PRD.md
```

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
- POST /api/leads/{lead_id}/pipeline  ← Feature 1

### Pipeline
- GET/POST /api/pipeline/stages
- PATCH /api/pipeline/stages/reorder  ← Feature 2
- PATCH /api/pipeline/stages/{stage_id}  ← Feature 2
- GET/POST /api/pipeline/deals
- PUT/DELETE /api/pipeline/deals/{deal_id}

### Clientes
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/{client_id}

### Operacional
- GET /api/operational  ← Feature 3
- PATCH /api/operational/{client_id}  ← Feature 3

### Conteúdo
- POST /api/content/carousel/generate  ← Feature 4

### Configurações
- GET/PUT /api/settings/webhook
- POST /api/settings/webhook/test
- GET/PUT /api/settings/carousel-webhook  ← Feature 4

### Dashboard
- GET /api/dashboard/kpis

### IA
- POST /api/ai/qualify-lead
- POST /api/ai/generate-content

---

## Backlog Priorizado

### P0 - Crítico (próxima sprint)
- [ ] Módulo Financeiro: faturas, cobranças recorrentes (Stripe)
- [ ] Calendário Editorial no módulo Conteúdo
- [ ] Detalhes do Lead: página individual com histórico e timeline
- [ ] Notificações in-app (leads novos, deals movidos)

### P1 - Importante
- [ ] Meta Ads / Google Ads integração com dados reais
- [ ] Módulo RH: cadastro de colaboradores + RBAC
- [ ] Integração WhatsApp API
- [ ] Integração Google Calendar
- [ ] Relatórios mensais automatizados por cliente
- [ ] Busca global (Command+K)
- [ ] Paginação nas tabelas de Leads e Clientes

### P2 - Desejável
- [ ] Onboarding wizard para novos usuários
- [ ] Score automático de leads via IA
- [ ] Multi-workspace (multi-tenant por agência)
- [ ] Exportação CSV / relatórios PDF
- [ ] Publicação automática no Instagram

### Refactoring Pendente
- [ ] Separar server.py em routers modulares (leads, pipeline, clients, operational, content, settings, ai)
- [ ] Adicionar paginação às listagens

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

## Notas Importantes
- **MongoDB vs PostgreSQL**: Usuário solicitou PostgreSQL/Prisma mas o ambiente usa MongoDB. Manter MongoDB.
- **Transações Atômicas**: MongoDB sem replica sets não suporta ACID. Usar bulk writes onde necessário.
- **ObjectId**: Sempre excluir _id das respostas MongoDB. Usar {"_id": 0} em projections ou $project na agregação.
