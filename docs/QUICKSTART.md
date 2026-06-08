# دليل البدء السريع - Jojo Unified Platform

## 📋 المتطلبات

- Node.js 18.x أو أحدث
- PostgreSQL 13+
- Redis 6+
- npm أو yarn

## 🚀 التثبيت

### 1. استنساخ المستودع

```bash
git clone https://github.com/jojo-org/unified-platform.git
cd jojo-unified-platform
```

### 2. تثبيت الحزم

```bash
# تثبيت جميع الحزم (Monorepo)
npm install

# أو باستخدام yarn
yarn install
```

### 3. إعداد متغيرات البيئة

```bash
# نسخ ملف المتغيرات
cp .env.example .env.local

# تحرير .env.local وإضافة بيانات اعتماد
nano .env.local
```

### 4. إعداد قاعدة البيانات

```bash
# تشغيل الهجرات
npm run db:migrate

# (اختياري) بذر البيانات التجريبية
npm run db:seed
```

### 5. تشغيل المشروع

```bash
# تشغيل جميع الخدمات
npm run dev

# أو تشغيل خدمة واحدة
npm run dev -w packages/web
npm run dev -w packages/api/operations-service
npm run dev -w packages/api/crm-service
npm run dev -w packages/api/n8n-service
```

## 🌐 الوصول للتطبيق

- **الواجهة الأمامية**: http://localhost:5173
- **خدمة العمليات**: http://localhost:3000
- **خدمة CRM**: http://localhost:3001
- **خدمة n8n**: http://localhost:3002

## 🧪 الاختبار

```bash
# تشغيل جميع الاختبارات
npm test

# اختبارات Integration
npm run test:integration

# اختبارات End-to-End
npm run test:e2e

# مع coverage
npm test -- --coverage
```

## 📚 الأدلة الإضافية

- [المعمارية](../ARCHITECTURE.md)
- [التطوير](DEVELOPMENT.md)
- [النشر](DEPLOYMENT.md)
- [الأمان](SECURITY.md)
- [API Documentation](API.md)

## 🆘 الاستكشاف وحل الأخطاء

### المشاكل الشائعة

#### 1. خطأ الاتصال بقاعدة البيانات

```bash
# تحقق من PostgreSQL
psql -c "SELECT version();"

# تحقق من متغير DATABASE_URL
echo $DATABASE_URL
```

#### 2. خطأ منفذ قيد الاستخدام

```bash
# على Windows
netstat -ano | findstr :3000

# على Linux/Mac
lsof -i :3000
```

#### 3. خطأ في الحزم

```bash
# احذف node_modules والـ lock files
rm -rf node_modules package-lock.json

# أعد التثبيت
npm install
```

## 📞 الدعم والمساعدة

- 📧 البريد الإلكتروني: support@jojo.local
- 💬 Discord: [رابط Discord]
- 🐛 المشاكل: [GitHub Issues]

---

**آخر تحديث**: June 2026
