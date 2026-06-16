# ⚡ Jojo Multi-Agent System - Quick Start Guide

## 🎯 System Status
```
✅ OPERATIONAL - ALL SYSTEMS GO
```

---

## 🚀 Quick Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Gateway** | http://localhost | Main entry point (Nginx) |
| **Web UI** | http://localhost/ui | React Dashboard |
| **n8n Local** | http://localhost:5678 | Workflow builder |
| **Operations API** | http://localhost:3000 | Agent orchestration |
| **Ollama** | http://localhost:11435 | LLM API |

---

## 🤖 Available Agents

```
1. Researcher Agent (agent-researcher)
   └─ Tools: Firecrawl search, web scraping, data collection

2. Analyst Agent (agent-analyst)
   └─ Tools: Data analysis, pattern recognition, reporting

3. Executor Agent (agent-executor)
   └─ Tools: API calls, database operations, workflow execution

4. Coordinator Agent (agent-coordinator)
   └─ Tools: Task delegation, priority management, resource allocation
```

---

## 💡 Common Tasks

### 1. Get Agent Status
```bash
curl http://localhost:3000/api/agents
```

### 2. Chat with AI (Llama 3.1)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"السلام عليكم","agent":"researcher"}'
```

### 3. Create a Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title":"market_analysis",
    "description":"تحليل السوق",
    "priority":"high"
  }'
```

### 4. Get System Status
```bash
curl http://localhost:3000/api/orchestration/status
```

### 5. View Database
```bash
docker exec -it jojo-postgres psql -U jojo_user -d jojo_db
```

---

## 🔧 Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f operations-service

# Rebuild a service
docker compose up -d --build operations-service

# Access database
docker exec -it jojo-postgres psql -U jojo_user -d jojo_db

# Check all services
docker compose ps
```

---

## 📊 Test Scripts

```bash
# Full comprehensive test
node scripts/test-multi-agent-system.js

# End-to-end test
node scripts/test-e2e.js

# tRPC integration test
node scripts/test-trpc-integration.js
```

---

## 📁 Important Files

```
jojo-unified-platform/
├── workflows/
│   ├── jojo-central-sovereign-orchestrator.json
│   └── jojo-multi-agent-orchestrator.json
├── config/
│   └── n8n-sync-config.json
├── docker-compose.yml
└── packages/
    └── api/
        └── operations-service/
            └── src/
                └── routes/
                    └── multiAgentOrchestration.ts
```

---

## ⚡ Key Features

- ✅ **4 Autonomous Agents** - Researcher, Analyst, Executor, Coordinator
- ✅ **Parallel Execution** - Multiple tasks simultaneously
- ✅ **Local LLM** - Llama 3.1 via Ollama (100% private)
- ✅ **Web Integration** - Firecrawl for search and scraping
- ✅ **Bidirectional Sync** - Local ↔ Cloud n8n instances
- ✅ **Database-backed** - PostgreSQL with Redis caching
- ✅ **Multi-language** - Arabic and English support

---

## 🔐 Credentials

```
Database User: jojo_user
Database Name: jojo_db
Database Port: 5432

Redis Host: redis
Redis Port: 6379

Ollama Endpoint: http://ollama:11434
Ollama Model: llama3.1

n8n Local: http://localhost:5678
n8n Cloud: https://dodgeqtr.app.n8n.cloud
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Service won't start** | `docker compose logs <service>` |
| **Port already in use** | `docker compose down -v` |
| **Database connection error** | Check PostgreSQL health: `docker exec jojo-postgres pg_isready` |
| **Llama not responding** | Check Ollama: `curl http://localhost:11435/api/tags` |
| **n8n not loading** | Clear browser cache, restart container |

---

## 📞 Support

```bash
# View service logs
docker compose logs -f

# Test connectivity
curl http://localhost:3000/health

# Check all agents
curl http://localhost:3000/api/agents

# Database connection test
docker exec jojo-postgres psql -U jojo_user -d jojo_db -c "SELECT NOW();"
```

---

## 🎯 Next Steps

1. **Import n8n Workflow**
   - Go to http://localhost:5678
   - Click "Import from File"
   - Select: `jojo-multi-agent-orchestration.json`

2. **Create Your First Workflow**
   - Drag agents into the canvas
   - Connect them together
   - Configure parameters

3. **Test with Real Data**
   - Send a request via webhook
   - Monitor agent execution
   - Review results in n8n

4. **Deploy to Production**
   - Set up monitoring
   - Configure backups
   - Enable high availability

---

**Status:** ✅ OPERATIONAL | **Last Updated:** 2026-06-15

For full documentation, see: `TEST_REPORT_MULTI_AGENT.md`
