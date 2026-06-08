# Jojo Unified Platform 🚀

**نظام موحد متعدد الطبقات للعمليات والأتمتة والإدارة**

دمج متقن لثلاثة مشاريع رئيسية:
- ✅ **n8n API Testing & Features** - منصة الأتمتة والتكامل
- ✅ **Jojo OpsHub** - مركز العمليات الموحد  
- ✅ **JojoCentral** - نظام إدارة العلاقات والعقارات

---

## 🏗️ البنية المعمارية

```
jojo-unified-platform/
├── packages/
│   ├── api/                          # خدمات Backend
│   │   ├── n8n-service/             # خدمة الأتمتة والتكامل
│   │   ├── crm-service/             # خدمة إدارة العلاقات والعقارات
│   │   ├── operations-service/      # خدمة العمليات والمراقبة
│   │   └── shared/                  # كود مشترك بين الخدمات
│   └── web/                         # Frontend موحد
│       ├── src/
│       │   ├── modules/             # وحدات الميزات
│       │   ├── shared/              # مكونات وأدوات مشتركة
│       │   └── pages/               # الصفحات الرئيسية
│       └── ...
├── database/                        # إدارة قاعدة البيانات
│   ├── migrations/                  # تطوريات قاعدة البيانات
│   ├── seeds/                       # بيانات البذر الأولية
│   └── schema.sql                   # مخطط قاعدة البيانات الموحد
├── docs/                            # التوثيق الشامل
└── .github/                         # إعدادات GitHub CI/CD
```

---

## 🛠️ التقنيات المستخدمة

### Backend
- **Node.js / Express** - خوادم API
- **TypeScript** - كتابة آمنة للأنواع
- **n8n** - منصة الأتمتة
- **PostgreSQL** - قاعدة البيانات
- **Redis** - التخزين المؤقت والجلسات

### Frontend
- **React + TypeScript** - واجهة المستخدم
- **shadcn/ui** - مكونات واجهة
- **TailwindCSS** - تنسيق الواجهة
- **tRPC** - اتصالات آمنة مع Backend

### الخدمات المدمجة
- **GitHub API** - إدارة المستودعات والـ webhooks
- **Google Drive** - إدارة الملفات
- **Gmail** - إدارة البريد الإلكتروني
- **HeyGen** - إنشاء الفيديوهات
- **Notion** - إدارة الملاحظات

---

## 📦 الخدمات الرئيسية

### 1. n8n-service (خدمة الأتمتة)
```typescript
// المسؤوليات:
- تطبيق workflows الأتمتة
- إدارة بيانات اعتماد الخدمات
- تنفيذ webhooks والمشغلات
- مراقبة تنفيذ العمليات
- تكامل مع الأنظمة الخارجية
```

### 2. crm-service (خدمة CRM)
```typescript
// المسؤوليات:
- إدارة جهات الاتصال والعملاء
- تتبع فرص البيع والعقود
- إدارة العقارات والممتلكات
- إدارة الموظفين والفريقات
- تحليلات المبيعات والأداء
```

### 3. operations-service (خدمة العمليات)
```typescript
// المسؤوليات:
- مراقبة صحة الأنظمة
- إدارة المخزونات والموارد
- تتبع الخدمات والمشاريع
- التقارير والتحليلات
- إدارة المستخدمين والأدوار
```

---

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- npm/yarn

### التثبيت والتشغيل

```bash
# استنساخ المستودع
git clone <repo-url>
cd jojo-unified-platform

# تثبيت الحزم
npm install

# إعداد متغيرات البيئة
cp .env.example .env.local

# تشغيل الهجرات
npm run db:migrate

# بذر البيانات الأولية
npm run db:seed

# تشغيل المشروع
npm run dev
```

---

## 📊 تكامل البيانات

```sql
-- الجداول الأساسية المدمجة
- users                  -- المستخدمون والمصادقة
- organizations         -- المنظمات والفريقات
- workflows            -- سير العمل الأوتوماتي
- contacts             -- جهات الاتصال والعملاء
- properties           -- العقارات والممتلكات
- services             -- الخدمات والمشاريع
- audit_logs           -- سجلات التدقيق الأمني
- notifications        -- الإشعارات والتنبيهات
```

---

## 🔐 الأمان والمصادقة

- ✅ OAuth 2.0 مع Google و GitHub
- ✅ JWT Tokens للمصادقة
- ✅ Ephemeral tokens للخدمات المؤقتة
- ✅ Encrypted credentials storage
- ✅ Role-based access control (RBAC)
- ✅ Audit logging شامل

---

## 📝 التوثيق

انظر المجلد `docs/` للتوثيق الشامل:
- [دليل المعمارية](docs/ARCHITECTURE.md)
- [دليل التطوير](docs/DEVELOPMENT.md)
- [دليل النشر](docs/DEPLOYMENT.md)
- [دليل الأمان](docs/SECURITY.md)

---

## 🤝 المساهمة

نرحب بالمساهمات! يرجى قراءة [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 الترخيص

MIT License - انظر [LICENSE](LICENSE)

---

**تطوير بواسطة**: فريق Jojo  
**آخر تحديث**: June 2026
