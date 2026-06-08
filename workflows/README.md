# n8n Workflows - Jojo Unified Platform

## Workflows المصدرة

| الاسم | الملف | الوصف |
|-------|-------|-------|
| 🧠 AI Agent Chat | `AI_agent_chat.json` | محادثة ذكية مع OpenAI |
| 🤖 AI Agent Workflow | `AI_Agent_workflow.json` | وكيل ذكي متكامل |
| 🛡️ JOJO Orchestrator | `jojo_orchestrator.json` | المنسق الرئيسي |
| 🔄 AI Comparison | `AI_Comparison_Workflow.json` | مقارنة نماذج AI |
| 📁 Load & Summarize Drive | `Load_and_summarize_Google_Drive_files_with_AI.json` | تلخيص ملفات Drive |

### Sub-Agents (المعاد تسميتها)

| الاسم الجديد | الاسم القديم | الدور |
|-------------|-------------|-------|
| `sub-agent-auth-validator` | 1 | التحقق من الصلاحيات |
| `sub-agent-data-enricher` | 2 | إثراء البيانات |
| `sub-agent-notification-dispatcher` | 3 | توزيع الإشعارات |
| `sub-agent-log-writer` | 4 | تسجيل السجلات |
| `sub-agent-cache-handler` | 6 | إدارة缓存 |
| `sub-agent-rate-limiter` | 7 | تحديد المعدل |
| `sub-agent-retry-orchestrator` | 8 | إعادة المحاولة |
| `sub-agent-webhook-processor` | 9 | معالجة webhooks |
| `sub-agent-scheduler-trigger` | 12 | جدولة المهام |
| `sub-agent-metrics-collector` | 13 | جمع المقاييس |
