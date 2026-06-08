# دليل النشر والإنتاج - Jojo Unified Platform

## 📦 متطلبات الإنتاج

- Docker و Docker Compose (مُفضَّل)
- Kubernetes cluster (للتطبيقات الكبيرة)
- CI/CD Pipeline (GitHub Actions / GitLab CI)
- SSL/TLS Certificates

## 🐳 النشر باستخدام Docker

### 1. بناء الصور

```bash
# بناء جميع الخدمات
docker-compose build

# أو بناء خدمة واحدة
docker-compose build operations-service
```

### 2. تشغيل الحاويات

```bash
# تشغيل البيئة الكاملة
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

### 3. ملف docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jojo_db
      POSTGRES_USER: jojo_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  operations-service:
    build: ./packages/api/operations-service
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  crm-service:
    build: ./packages/api/crm-service
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  n8n-service:
    build: ./packages/api/n8n-service
    ports:
      - "3002:3002"
    depends_on:
      - postgres

  web:
    build: ./packages/web
    ports:
      - "5173:5173"
    depends_on:
      - operations-service

volumes:
  postgres_data:
```

## ☸️ النشر على Kubernetes

### 1. إعداد الـ Manifests

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: jojo

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: operations-service
  namespace: jojo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: operations-service
  template:
    metadata:
      labels:
        app: operations-service
    spec:
      containers:
      - name: operations-service
        image: jojo/operations-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: jojo-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 2. نشر على Kubernetes

```bash
# إنشاء namespace
kubectl create namespace jojo

# إنشاء Secrets
kubectl create secret generic jojo-secrets \
  --from-literal=database-url=$DATABASE_URL \
  -n jojo

# نشر التطبيقات
kubectl apply -f k8s/

# التحقق من الحالة
kubectl get pods -n jojo
```

## 🔄 CI/CD Pipeline (GitHub Actions)

### ملف .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build packages
        run: npm run build

      - name: Build Docker images
        run: docker-compose build

      - name: Push to Docker Hub
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
          docker-compose push

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
          kubectl set image deployment/operations-service \
            operations-service=jojo/operations-service:latest \
            -n jojo
```

## 🔒 الأمان في الإنتاج

### 1. متغيرات البيئة الحساسة

```bash
# استخدم AWS Secrets Manager أو HashiCorp Vault
# أبداً لا تضع Secrets في ملفات التكوين
```

### 2. SSL/TLS

```bash
# استخدم Let's Encrypt
certbot certonly --standalone -d jojo.example.com

# أو استخدم Nginx مع mkcert للتطوير
```

### 3. الجدران الناري

```bash
# السماح بالمنافذ الضرورية فقط
- Port 80 (HTTP redirect)
- Port 443 (HTTPS)
- Port 5173 (Frontend)
- Port 3000 (API)
```

## 📊 المراقبة والتسجيل

### 1. Prometheus Metrics

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'jojo-services'
    static_configs:
      - targets: ['localhost:3000', 'localhost:3001', 'localhost:3002']
```

### 2. ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# تشغيل ELK
docker-compose -f docker-compose.elk.yml up -d

# الوصول إلى Kibana
# http://localhost:5601
```

## 📈 الأداء والتحسين

### 1. Caching Strategy

```typescript
// Cache responses in Redis
app.get('/api/contacts', async (req, res) => {
  const cacheKey = 'contacts:all'
  const cached = await redis.get(cacheKey)
  
  if (cached) return res.json(JSON.parse(cached))
  
  const contacts = await db.contacts.find()
  await redis.setex(cacheKey, 3600, JSON.stringify(contacts))
  res.json(contacts)
})
```

### 2. Database Optimization

```sql
-- إضافة Indexes
CREATE INDEX idx_contacts_org_created 
  ON contacts(org_id, created_at DESC);

-- استخدام EXPLAIN للتحليل
EXPLAIN ANALYZE SELECT * FROM contacts WHERE org_id = $1;
```

### 3. Load Balancing

```bash
# Nginx Configuration
upstream jojo_api {
    server operations-service:3000;
    server operations-service:3000;  # نسخة ثانية
    server operations-service:3000;  # نسخة ثالثة
}

server {
    listen 80;
    server_name api.jojo.com;
    
    location / {
        proxy_pass http://jojo_api;
    }
}
```

## 🔄 استراتيجية التحديث

### Blue-Green Deployment

```bash
# النسخة الزرقاء (الحالية)
kubectl set image deployment/operations-service-blue \
  operations-service=jojo/operations-service:v1.0.0

# النسخة الخضراء (الجديدة)
kubectl set image deployment/operations-service-green \
  operations-service=jojo/operations-service:v1.1.0

# التبديل بسهولة إذا حدثت مشاكل
kubectl patch service operations-service -p \
  '{"spec":{"selector":{"version":"green"}}}'
```

## 📝 Checklist النشر

- [ ] جميع الاختبارات تمر
- [ ] لا توجد تحذيرات من Linter
- [ ] متغيرات البيئة مكتملة
- [ ] قاعدة البيانات مهيأة
- [ ] النسخ الاحتياطية جاهزة
- [ ] مراقبة الأداء مفعلة
- [ ] تنبيهات الأخطاء مفعلة
- [ ] SSL/TLS مُفعَّل
- [ ] WAF مُفعَّل
- [ ] Log aggregation يعمل

---

**آخر تحديث**: June 2026
