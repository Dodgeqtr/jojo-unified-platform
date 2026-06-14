-- Migration 003: CRM / Real Estate Extensions
-- تاريخ: June 2026
-- الهدف: توسيع الـ schema الأساسي بميزات CRM العقاري (عقود، تفضيلات،
-- نشاطات، تذكيرات، تقويم، رسائل، موظفون مفوّضون) — مستخرجة ومُعاد
-- تكييفها من الأرشيف (jojo-unified-real / crm-service) إلى PostgreSQL.

-- ===== 1. توسيع جدول contacts (تصنيف وتفضيلات العميل) =====
ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS classification VARCHAR(20) DEFAULT 'cold', -- hot / warm / cold
    ADD COLUMN IF NOT EXISTS preferred_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS preferred_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS budget_min DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS budget_max DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_contacts_classification ON contacts(classification);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);

-- ===== 2. توسيع جدول properties (موقع وتفاصيل ومسؤول) =====
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES users(id);
-- ملاحظة: bedrooms و bathrooms موجودة أصلاً في schema.sql (001)، لا تكرار.

CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);

-- ===== 3. توسيع جدول deals (نوع الصفقة وسبب الخسارة) =====
ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS deal_type VARCHAR(50), -- sale / rent / management ...
    ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- ===== 4. العقود (Contracts) =====
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    property_id UUID REFERENCES properties(id),
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    contract_number VARCHAR(100) UNIQUE,
    contract_type VARCHAR(50), -- sale / lease / management
    status VARCHAR(50) DEFAULT 'draft', -- draft / active / expired / cancelled
    start_date DATE,
    end_date DATE,
    value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'SAR',
    terms TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property ON contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);

-- ===== 5. ملفات العقارات (Property Files) =====
CREATE TABLE IF NOT EXISTS property_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50), -- image / document / floor_plan ...
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_property_files_property ON property_files(property_id);

-- ===== 6. المفضلة (Favorites) =====
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    property_id UUID REFERENCES properties(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ===== 7. الاستفسارات (Inquiries) =====
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    property_id UUID REFERENCES properties(id),
    contact_id UUID REFERENCES contacts(id),
    assigned_to UUID REFERENCES users(id),
    message TEXT,
    status VARCHAR(50) DEFAULT 'new', -- new / in_progress / resolved / closed
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_org ON inquiries(org_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned ON inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- ===== 8. الموظفون المفوّضون (Authorized Employees) =====
CREATE TABLE IF NOT EXISTS authorized_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    title VARCHAR(100),
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_authorized_employees_org ON authorized_employees(org_id);

-- ===== 9. أنشطة CRM (Activities) =====
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    activity_type VARCHAR(50) NOT NULL, -- call / email / meeting / note ...
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);

-- ===== 10. تذكيرات CRM (Reminders) =====
CREATE TABLE IF NOT EXISTS crm_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    due_at TIMESTAMP NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_reminders_due ON crm_reminders(due_at, is_completed);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_org ON crm_reminders(org_id);

-- ===== 11. أحداث التقويم (Calendar Events) =====
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    related_entity_type VARCHAR(50), -- contact / deal / property / contract
    related_entity_id UUID,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON calendar_events(org_id);

-- ===== 12. الرسائل (Messages) =====
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    recipient_id UUID REFERENCES users(id) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, is_read);
