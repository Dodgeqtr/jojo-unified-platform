# 🏗️ معمارية Jojo Unified Platform

## 📋 نظرة عامة

هذا المستند يصف المعمارية الشاملة للنظام الموحد ودمج الثلاث مشاريع الرئيسية.

---

## 1. الطبقات المعمارية

```
┌─────────────────────────────────────────┐
│        Presentation Layer (Web)         │
│  React + shadcn/ui + TailwindCSS        │
├─────────────────────────────────────────┤
│      API Gateway & Orchestration        │
│   (tRPC, GraphQL, REST Endpoints)       │
├─────────────────────────────────────────┤
│        Business Logic Layer             │
│  n8n-service │ CRM-service │ Ops-service
├─────────────────────────────────────────┤
│     Data Access & Integration Layer     │
│  Database │ Cache │ External Services   │
└─────────────────────────────────────────┘
```

---

## 2. الخدمات الجزئية (Microservices)

### 2.1 n8n-service
**الغرض**: إدارة الأتمتة والتكاملات

**المسؤوليات**:
- CRUD workflows
- Manage credentials
- Execute workflows
- Handle webhooks
- Monitor executions
- Error handling & retries

**العلاقات**:
- ← يستقبل طلبات من: `operations-service`, `crm-service`
- → يرسل بيانات إلى: Database, External services
- ↔ يتواصل مع: GitHub, Google Drive, Gmail, Outlook

### 2.2 crm-service
**الغرض**: إدارة العلاقات والعقارات

**المسؤوليات**:
- Contact management
- Deal tracking
- Property management
- Employee management
- Team organization
- Analytics & reporting

**العلاقات**:
- ← يستقبل من: `operations-service`
- → يرسل إلى: `n8n-service` (trigger workflows)
- ↔ يتكامل مع: HeyGen, Google Drive, Gmail

### 2.3 operations-service
**الغرض**: مركز العمليات الموحد

**المسؤوليات**:
- Health monitoring
- Resource management
- Service orchestration
- Reporting & analytics
- User management
- Audit logging

**العلاقات**:
- ← يستقبل من: Web frontend
- → يوزع على: `crm-service`, `n8n-service`
- ↔ يراقب: System health, Performance metrics

---

## 3. تدفق البيانات

```
Web Frontend
    ↓
API Gateway (tRPC Router)
    ↓
┌───────────────────────────────┐
│   Operations Service (Hub)    │ ← المنسّق الرئيسي
└───────────────────────────────┘
    ↓           ↓           ↓
    ↓           ↓           ↓
┌──────────┐ ┌────────┐ ┌──────────┐
│ CRM Srv  │ │ n8n Srv│ │ Other Svcs
└──────────┘ └────────┘ └──────────┘
    ↓           ↓           ↓
┌───────────────────────────────┐
│    Database & Cache Layer     │
│  PostgreSQL + Redis           │
└───────────────────────────────┘
    ↓
External Services & APIs
(GitHub, Google, etc.)
```

---

## 4. مخطط قاعدة البيانات الموحد

### الجداول الأساسية

```sql
-- المصادقة والمستخدمون
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  oauth_providers JSON,
  created_at TIMESTAMP
);

-- المنظمات
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  owner_id UUID REFERENCES users,
  settings JSON
);

-- الأدوار والأذونات
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  name VARCHAR,
  permissions JSON
);

-- سير العمل (من n8n)
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  n8n_workflow_id VARCHAR,
  name VARCHAR,
  description TEXT,
  is_active BOOLEAN,
  definition JSON,
  created_at TIMESTAMP
);

-- جهات الاتصال (من CRM)
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  metadata JSON
);

-- العقارات (من CRM)
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  name VARCHAR NOT NULL,
  location VARCHAR,
  type VARCHAR,
  details JSON,
  created_at TIMESTAMP
);

-- الخدمات والمشاريع
CREATE TABLE services (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  name VARCHAR NOT NULL,
  status VARCHAR,
  metadata JSON
);

-- سجل التدقيق
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations,
  user_id UUID REFERENCES users,
  action VARCHAR,
  entity_type VARCHAR,
  entity_id UUID,
  changes JSON,
  timestamp TIMESTAMP
);

-- الإشعارات
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title VARCHAR,
  message TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP
);
```

---

## 5. التكامل بين الخدمات

### 5.1 سيناريو: إنشاء عميل جديد

```
1. Web Frontend
   └─> POST /api/contacts
       └─> operations-service
           ├─> crm-service (create contact)
           └─> n8n-service (trigger welcome workflow)
               └─> send email + create folder on Drive
```

### 5.2 سيناريو: تنفيذ workflow الأتمتة

```
1. Webhook من خدمة خارجية
   └─> n8n-service (receive webhook)
       ├─> Update workflow status
       ├─> Call CRM service (update contact)
       └─> Notify operations-service
           └─> Create audit log
           └─> Send notification
```

---

## 6. APIs العامة

### 6.1 REST/tRPC Endpoints

```typescript
// Operations Service (الواجهة الرئيسية)
POST   /api/contacts               // إنشاء جهة اتصال
GET    /api/contacts/:id           // الحصول على جهة اتصال
PUT    /api/contacts/:id           // تحديث جهة اتصال
DELETE /api/contacts/:id           // حذف جهة اتصال

POST   /api/properties             // إدارة العقارات
GET    /api/workflows              // عرض workflows
POST   /api/workflows/execute      // تنفيذ workflow
GET    /api/dashboard              // إحصائيات المتحكم

// n8n Service (Specialized)
POST   /api/n8n/workflows          // إنشاء workflow
GET    /api/n8n/workflows/:id      // الحصول على workflow
PUT    /api/n8n/webhooks           // قبول webhooks

// CRM Service (Specialized)
POST   /api/crm/contacts           // إدارة جهات الاتصال
POST   /api/crm/deals              // إدارة الفرص البيعية
POST   /api/crm/properties         // إدارة العقارات
```

---

## 7. الأمان والمصادقة

```
┌─────────────────────────────┐
│  OAuth2 / Social Login      │
│  (Google, GitHub)           │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  JWT Token Generation       │
│  + Refresh Token            │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  Middleware Authentication  │
│  + RBAC Authorization       │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  Service-to-Service Auth    │
│  (Ephemeral tokens)         │
└─────────────────────────────┘
```

---

## 8. التوسعية والأداء

### 8.1 التخزين المؤقت (Caching)

```
Redis Cache Layers:
├─ User Sessions (TTL: 7 days)
├─ API Response Cache (TTL: 1 hour)
├─ Workflow Definitions (TTL: 24 hours)
└─ Rate Limiting Counters (TTL: 1 minute)
```

### 8.2 المراقبة والتنبيهات

```
Monitoring Stack:
├─ Prometheus (Metrics)
├─ Grafana (Visualization)
├─ ELK Stack (Logging)
└─ Alert Manager (Notifications)
```

---

## 9. خارطة الطريق

### المرحلة الأولى (Q3 2026)
- ✅ دمج البيانات
- ✅ API Gateway موحد
- ✅ Frontend أساسي

### المرحلة الثانية (Q4 2026)
- ☐ AI Integration
- ☐ Advanced Analytics
- ☐ Mobile App

### المرحلة الثالثة (2027)
- ☐ Global Scaling
- ☐ Advanced Automations
- ☐ ML-powered Insights

---

## 10. التطوير والاختبار

### Unit Testing
```bash
npm run test
```

### Integration Testing
```bash
npm run test:integration
```

### E2E Testing
```bash
npm run test:e2e
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

---

**آخر تحديث**: June 2026  
**الإصدار**: 1.0.0-alpha
