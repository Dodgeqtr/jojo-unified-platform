# Integration Guide - دليل التكامل

## 🔗 كيفية عمل التكامل بين الخدمات

هذا المستند يشرح كيف تعمل الخدمات الثلاث معاً في النظام الموحد.

---

## 1. عملية التكامل الأساسية

```
User Action (في Frontend)
    ↓
API Gateway (operations-service)
    ↓
┌─────────────────────────────────────────┐
│  تحديد الخدمة المناسبة (Router)         │
└─────────────────────────────────────────┘
    ↙               ↓               ↘
    ↓               ↓               ↓
CRM Service    n8n Service    Operations
    ↓               ↓               ↓
    └─────────────────────────────┘
              ↓
        Database & Cache
```

---

## 2. سيناريوهات التكامل الشائعة

### السيناريو 1: إنشاء عميل جديد مع workflow ترحيب

```typescript
// 1. المستخدم ينقر على "إضافة عميل"
POST /api/contacts
Body: {
  name: "Ahmed Al-Dossary",
  email: "ahmed@example.com",
  company: "Tech Company"
}

// 2. operations-service يستقبل الطلب

// 3. crm-service ينشئ الاتصال
POST crm-service:3001/api/contacts
Response: { id: "contact-123", ... }

// 4. operations-service يُرسل trigger إلى n8n
POST n8n-service:3002/webhooks/new-contact
Body: { 
  contactId: "contact-123",
  email: "ahmed@example.com"
}

// 5. n8n workflow ينفذ:
//    - إرسال بريد ترحيب
//    - إنشاء مجلد في Google Drive
//    - إضافة إلى قائمة Gmail

// 6. معاودة الاتصال إلى operations-service
POST operations-service:3000/webhooks/workflow-complete
Body: {
  contactId: "contact-123",
  status: "welcome-email-sent"
}

// 7. الإشعار للمستخدم
// Notification: "تم إنشاء العميل بنجاح وإرسال البريد الترحيبي"
```

### السيناريو 2: تحديث حالة العقار

```typescript
// 1. مدير العقارات يحدّث حالة عقار
PUT /api/properties/property-456
Body: {
  status: "rented",
  tenant_id: "contact-789"
}

// 2. crm-service يحدّث قاعدة البيانات

// 3. Trigger إلى n8n (إذا كان مفعلاً)
// - إنشاء عقد إيجار
// - إرسال إشعار للعميل
// - تحديث الفاتورة

// 4. تحديث سجل التدقيق
INSERT INTO audit_logs VALUES (...)

// 5. تحديث Dashboard في الوقت الفعلي
// WebSocket event: "property:updated"
```

### السيناريو 3: تقرير المبيعات الشهري

```typescript
// 1. جدولة تقرير (يومي/أسبوعي/شهري)
POST /api/workflows
Body: {
  name: "Monthly Sales Report",
  trigger_type: "schedule",
  cron: "0 0 1 * *" // الأول من كل شهر
}

// 2. n8n ينفذ Workflow:
//    - استعلام قاعدة البيانات للـ deals المُغلقة
//    - حساب الإيرادات الكلية
//    - تحضير الرسوم البيانية

// 3. الحصول على البيانات من CRM
GET crm-service:3001/api/deals?status=won&date_range=month

// 4. توليد التقرير
// - PDF report
// - Excel file
// - Email distribution

// 5. حفظ النتيجة في Database
INSERT INTO reports VALUES (...)

// 6. إشعار المستخدمين
// Email: "Your monthly sales report is ready"
```

---

## 3. Event-Driven Architecture

### 3.1 نظام الأحداث

```typescript
// في operations-service
import EventEmitter from 'events'

const eventBus = new EventEmitter()

// عند إنشاء contact جديد
eventBus.emit('contact:created', { id: 'contact-123', email: '...' })

// Services تستمع للأحداث
eventBus.on('contact:created', async (contact) => {
  // أخبر n8n
  await fetch('http://n8n-service:3002/webhooks/contact-created', {
    method: 'POST',
    body: JSON.stringify(contact)
  })
  
  // أنشئ إشعار
  await db.notifications.create({
    user_id: req.user.id,
    message: `تم إنشاء العميل ${contact.name}`
  })
})
```

### 3.2 Message Queue (Redis)

```typescript
// استخدام Redis للمهام الثقيلة
import Bull from 'bull'

const contactQueue = new Bull('contact-tasks', {
  redis: process.env.REDIS_URL
})

// جهة المُرسِل
contactQueue.add(
  'send-welcome-email',
  { contactId: 'contact-123' },
  { delay: 5000 }
)

// جهة المُستقبِل
contactQueue.process('send-welcome-email', async (job) => {
  const contact = await db.contacts.findById(job.data.contactId)
  await sendEmail(contact.email, 'Welcome!')
})
```

---

## 4. Communication Patterns

### 4.1 Synchronous (Request/Response)

```typescript
// خدمة A تنادي خدمة B مباشرة
async function createContactWithWorkflow(contactData) {
  // 1. إنشاء contact
  const contact = await fetch('http://crm-service:3001/api/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData)
  })
  
  // 2. تنفيذ workflow (الانتظار للاكتمال)
  const execution = await fetch('http://n8n-service:3002/workflows/execute', {
    method: 'POST',
    body: JSON.stringify({ contactId: contact.id })
  })
  
  // 3. الرد للعميل
  return { contact, execution }
}
```

### 4.2 Asynchronous (Event-Based)

```typescript
// خدمة A تُرسل حدث، والخدمات الأخرى تستمع
eventBus.emit('contact:created', { id: 'contact-123' })

// في n8n-service
eventBus.on('contact:created', async (contact) => {
  // نفذ بدون انتظار الرد
  // هذا يسمح بالعمل بالتوازي
})
```

---

## 5. Error Handling and Retry Logic

### 5.1 معالجة الأخطاء

```typescript
// في operations-service
async function callCrmService(endpoint, data) {
  const maxRetries = 3
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://crm-service:3001${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
        timeout: 5000
      })
      
      if (!response.ok) {
        throw new Error(`CRM Service error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      lastError = error
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        await sleep(Math.pow(2, i) * 1000)
      }
    }
  }
  
  // log the failure
  console.error('CRM Service failed after retries:', lastError)
  throw lastError
}
```

### 5.2 Circuit Breaker Pattern

```typescript
import CircuitBreaker from 'opossum'

const crm = new CircuitBreaker(async (endpoint, data) => {
  return fetch(`http://crm-service:3001${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
})

crm.fallback(() => {
  // إذا فشلت الخدمة، استخدم fallback
  return { id: 'temp-id', cached: true }
})
```

---

## 6. Data Synchronization

### 6.1 الحفاظ على تزامن البيانات

```typescript
// في case الحذف
DELETE /api/contacts/contact-123

// 1. حذف من CRM
await db.contacts.delete(contactId)

// 2. تحديث جميع الـ references
await db.deals.updateMany(
  { contact_id: contactId },
  { contact_id: null }
)

await db.properties.updateMany(
  { owner_id: contactId },
  { owner_id: null }
)

// 3. حذف الـ workflows المرتبطة
await fetch('http://n8n-service:3002/api/workflows', {
  method: 'DELETE',
  body: JSON.stringify({ contactId })
})

// 4. إضافة إلى سجل التدقيق
await db.audit_logs.create({
  action: 'DELETE',
  entity_type: 'contact',
  entity_id: contactId,
  old_values: contact
})
```

### 6.2 CDC (Change Data Capture)

```typescript
// استخدام PostgreSQL Logical Replication
// للحفاظ على تزامن آني بين الخدمات

CREATE PUBLICATION contacts_pub FOR TABLE contacts
CREATE SUBSCRIPTION contacts_sub 
  CONNECTION 'postgresql://...' 
  PUBLICATION contacts_pub
```

---

## 7. API Gateway Pattern

### 7.1 Role-Based Routing

```typescript
// في operations-service (API Gateway)
app.post('/api/contacts', authenticate, authorize('contacts.create'), 
  async (req, res) => {
    
    // تحديد الخدمة بناءً على نوع الطلب
    if (req.body.type === 'customer') {
      // أرسل إلى crm-service
      const result = await axios.post(
        'http://crm-service:3001/api/contacts',
        req.body
      )
      res.json(result.data)
    } else if (req.body.type === 'automation') {
      // أرسل إلى n8n-service
      const result = await axios.post(
        'http://n8n-service:3002/api/workflows',
        req.body
      )
      res.json(result.data)
    }
  }
)
```

---

## 8. Monitoring and Debugging

### 8.1 Distributed Tracing

```typescript
import * as otel from '@opentelemetry/api'

const tracer = otel.trace.getTracer('jojo-platform')

app.post('/api/contacts', (req, res) => {
  const span = tracer.startSpan('create-contact')
  
  try {
    span.setAttributes({
      'contact.name': req.body.name,
      'contact.email': req.body.email
    })
    
    // إنشاء العميل
    // ...
    
  } finally {
    span.end()
  }
})
```

### 8.2 Logging Context

```typescript
// استخدم correlation IDs
const correlationId = req.headers['x-correlation-id'] || uuidv4()

logger.info('Creating contact', {
  correlationId,
  service: 'operations-service',
  action: 'create-contact',
  contactName: req.body.name
})

// forward إلى الخدمات الأخرى
fetch('http://crm-service:3001/api/contacts', {
  headers: {
    'x-correlation-id': correlationId
  },
  body: JSON.stringify(req.body)
})
```

---

## 9. Testing Integration

```typescript
// اختبار integration بين الخدمات
describe('Contact Creation Workflow', () => {
  it('should create contact and trigger welcome workflow', async () => {
    // 1. Mock الخدمات
    const crmMock = jest.fn().mockResolvedValue({ id: 'contact-123' })
    const n8nMock = jest.fn().mockResolvedValue({ execution_id: 'exec-1' })
    
    // 2. استدعاء API
    const response = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: 'test@example.com' })
    
    // 3. التحقق
    expect(response.status).toBe(201)
    expect(crmMock).toHaveBeenCalledWith(...)
    expect(n8nMock).toHaveBeenCalledWith(...)
  })
})
```

---

**آخر تحديث**: June 2026
