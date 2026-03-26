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
- **Kanban/DnD:** @dnd-kit/core para drag-and-drop
- **Charts:** Recharts
- **Integrações:** N8N (webhooks configuráveis)

---

## O Que Foi Implementado

### v1.0 - Base (Janeiro 2026)
- [x] Auth: Registro, Login (JWT), Google OAuth (Emergent), /me, Logout
- [x] Leads CRUD: Criar, listar, editar, deletar leads com score e status
- [x] Pipeline: 6 etapas pré-configuradas, CRUD de deals
- [x] Clientes CRUD: Gestão de clientes com MRR, CPF/CNPJ, billing_type
- [x] Dashboard KPIs: total_leads, pipeline_value, mrr, active_clients, conversion_rate
- [x] IA endpoints: /ai/qualify-lead e /ai/generate-content
- [x] Webhook N8N: GET/PUT /api/settings/webhook + test

### v1.1 - Prompt Avançado (Fevereiro 2026) ✅ TESTADO 100%
- [x] Feature 1: Botão "Adicionar ao Pipeline" dentro do modal de criação de Lead
- [x] Feature 2: Edição do Pipeline (drag-and-drop, renomear, soft delete com desfazer)
- [x] Feature 3: Cards Operacionais por cliente (criação automática + toggles Meta/Google/Reports/Alertas)
- [x] Feature 4: Geração de Carrossel via N8N (webhook configurável, retry 3x)

### v1.2 - Dashboard Operacional Estilo ClickUp (Fevereiro 2026) ✅ TESTADO 100% (22/22)
- [x] Módulo Colaboradores (CRUD global: gestor/analista/designer)
- [x] Atribuição Colaborador ↔ Cliente (responsável / apoio)
- [x] Tarefas Operacionais por cliente:
  - Colunas: Status, Responsável, Data inicial, Vencimento, Estimativa, Prioridade, Tempo rastreado, Comentários
  - Inline editing para todos os campos (clique para editar)
  - Drag-and-drop para reordenar (@dnd-kit/sortable)
  - Subtarefas expansíveis
  - Soft delete com confirmação
- [x] Template padrão da agência (14 tarefas pré-configuradas)
- [x] Log de tempo manual (minutos → formatado como "1h 20m")
- [x] Comentários por tarefa (histórico em drawer lateral)
- [x] Visão geral Operacional com filtro por gestor
- [x] Cards de cliente com resumo de tarefas (done/todo/overdue + barra de progresso)
- [x] Modal "Gerenciar Equipe" global
- [x] Modal "Equipe do Cliente" no dashboard individual

---

## Arquitetura de Arquivos
```
/app/
├── backend/
│   ├── server.py              # FastAPI monolith (~1346 linhas) - todos os endpoints
│   ├── tests/
│   │   ├── test_agenciaos.py  # 13 testes (v1.1)
│   │   └── test_operational.py # 22 testes (v1.2)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── components/ui/     # Shadcn components
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── comercial/     # Leads.jsx, Pipeline.jsx
│   │   │   ├── clientes/      # Clientes.jsx
│   │   │   ├── operacional/
│   │   │   │   ├── Operacional.jsx          # Overview com filtro gestor
│   │   │   │   ├── ClientTaskDashboard.jsx  # Dashboard individual (ClickUp)
│   │   │   │   ├── TaskRow.jsx              # SortableTaskRow + SubTaskRow
│   │   │   │   ├── TaskCells.jsx            # Células inline (Status, Priority, etc)
│   │   │   │   ├── CommentsDrawer.jsx       # Drawer de comentários
│   │   │   │   └── taskConfig.js            # Constantes e utils
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
- POST /api/auth/register, POST /api/auth/login, GET /api/auth/me

### Leads
- GET/POST /api/leads, GET/PUT/DELETE /api/leads/:id
- POST /api/leads/:id/pipeline

### Pipeline
- GET/POST /api/pipeline/stages, PATCH /api/pipeline/stages/reorder
- PATCH /api/pipeline/stages/:id, GET/POST /api/pipeline/deals, PUT/DELETE /api/pipeline/deals/:id

### Clientes
- GET/POST /api/clients, GET/PUT/DELETE /api/clients/:id

### Colaboradores (v1.2)
- GET /api/collaborators?role=manager
- POST /api/collaborators
- PATCH /api/collaborators/:id
- DELETE /api/collaborators/:id
- GET /api/clients/:clientId/collaborators
- POST /api/clients/:clientId/collaborators
- DELETE /api/clients/:clientId/collaborators/:collabId

### Tarefas Operacionais (v1.2)
- GET /api/clients/:clientId/tasks?status=&assignee_id=&priority=&parent_task_id=
- POST /api/clients/:clientId/tasks
- POST /api/clients/:clientId/tasks/apply-template
- PATCH /api/tasks/reorder
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id
- POST /api/tasks/:id/time
- GET /api/tasks/:id/comments
- POST /api/tasks/:id/comments

### Operacional
- GET /api/operational (toggles Meta/Google/Reports/Alerts)
- PATCH /api/operational/:client_id
- GET /api/operational/summary?manager_id= (v1.2)

### Conteúdo / IA / Configurações
- POST /api/content/carousel/generate
- POST /api/ai/qualify-lead, POST /api/ai/generate-content
- GET/PUT /api/settings/webhook, GET/PUT /api/settings/carousel-webhook
- GET /api/dashboard/kpis

---

## Backlog Priorizado

### P0 - Próxima sprint
- [ ] **Refactoring crítico**: Separar server.py (~1346 linhas) em routers modulares (collaborators.py, tasks.py, clients.py, etc.)
- [ ] Módulo Financeiro: faturas, cobranças recorrentes (Stripe)
- [ ] Detalhes do Lead: página individual com histórico e timeline

### P1 - Importante
- [ ] Meta Ads / Google Ads integração com dados reais
- [ ] Módulo RH: cadastro de colaboradores + RBAC
- [ ] Integração WhatsApp API
- [ ] Integração Google Calendar para agendamentos automáticos
- [ ] Calendário Editorial no módulo Conteúdo
- [ ] Relatórios mensais automatizados por cliente

### P2 - Desejável
- [ ] Paginação nas tabelas de Leads, Clientes, Tarefas
- [ ] Busca global (Command+K)
- [ ] Exportação CSV / relatórios PDF
- [ ] Publicação automática no Instagram
- [ ] Multi-workspace (multi-tenant por agência)
- [ ] Onboarding wizard para novos usuários

### Refactoring
- [ ] Separar server.py em routers modulares (prioritário - 1346 linhas)
- [ ] Adicionar paginação às listagens

---

## Notas Importantes
- **MongoDB vs PostgreSQL**: Usuário solicitou PostgreSQL/Prisma mas ambiente usa MongoDB. Manter MongoDB.
- **Tempo em minutos**: Sempre armazenar `estimated_minutes` e `tracked_minutes` como inteiros. Formatar na exibição: `formatMinutes(80)` → "1h 20m".
- **ObjectId**: Sempre excluir `_id` das respostas. Usar `{"_id": 0}` em projections.
- **Tarefas deletadas**: Sempre usar soft delete (`deleted_at = now()`), nunca hard delete.
