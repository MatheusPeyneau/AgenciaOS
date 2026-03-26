# Auth Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
API="https://campaign-central-41.preview.emergentagent.com/api"

# Register
curl -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@agenciaos.com","password":"test123"}'

# Login
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@agenciaos.com","password":"test123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Me
curl -X GET "$API/auth/me" -H "Authorization: Bearer $TOKEN"

# Create Lead
curl -X POST "$API/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lead Teste","email":"lead@teste.com","company":"Empresa Teste","source":"instagram","status":"novo","score":75}'

# Pipeline stages
curl -X GET "$API/pipeline/stages" -H "Authorization: Bearer $TOKEN"

# Dashboard KPIs
curl -X GET "$API/dashboard/kpis" -H "Authorization: Bearer $TOKEN"
```

## Step 3: Browser Testing
```python
await page.context.add_cookies([{
    "name": "token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "campaign-central-41.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://campaign-central-41.preview.emergentagent.com")
```

## Checklist
- [ ] User can register with email/password
- [ ] User can login with email/password
- [ ] Token stored in localStorage
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Dashboard loads KPIs
- [ ] Leads CRUD works
- [ ] Pipeline Kanban loads and drag-and-drop works
- [ ] Clientes CRUD works
- [ ] Theme toggle works
- [ ] Sidebar navigation works

## Success Indicators
- /api/auth/me returns user data
- Dashboard loads without redirect
- CRUD operations work
- Kanban drag-and-drop moves deals between stages
