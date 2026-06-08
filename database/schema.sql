-- =================================================================
-- Jojo Unified Platform - Database Schema
-- آخر تحديث: June 2026
-- =================================================================

-- ===== 1. المصادقة والمستخدمون =====

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    oauth_provider VARCHAR(50), -- 'google', 'github', etc
    oauth_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- ===== 2. المنظمات والفريقات =====

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    owner_id UUID REFERENCES users(id) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ===== 3. عضويات المنظمة =====

CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id)
);

-- ===== 4. الأدوار والأذونات =====

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== 5. سير العمل (Workflows) - من n8n =====

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    n8n_id VARCHAR(255), -- معرف workflow في n8n
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100), -- 'webhook', 'schedule', 'manual'
    is_active BOOLEAN DEFAULT true,
    definition JSONB, -- تعريف workflow الكامل
    execution_count INT DEFAULT 0,
    last_executed TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_org ON workflows(org_id);
CREATE INDEX idx_workflows_active ON workflows(is_active);

-- ===== 6. تنفيذات Workflows =====

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) NOT NULL,
    status VARCHAR(50), -- 'pending', 'running', 'success', 'failed'
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    duration_ms INT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);

-- ===== 7. بيانات الاعتماد (Credentials) =====

CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'github', 'google', 'n8n', etc
    encrypted_data BYTEA NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credentials_org ON credentials(org_id);

-- ===== 8. جهات الاتصال (Contacts) - من CRM =====

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    position VARCHAR(100),
    contact_type VARCHAR(50), -- 'customer', 'prospect', 'vendor'
    source VARCHAR(100), -- 'website', 'github', 'email', etc
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_type ON contacts(contact_type);

-- ===== 9. المشاريع والعقود =====

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'SAR',
    status VARCHAR(50), -- 'proposal', 'negotiation', 'won', 'lost'
    stage VARCHAR(50),
    probability INT,
    expected_close_date DATE,
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deals_org ON deals(org_id);
CREATE INDEX idx_deals_status ON deals(status);

-- ===== 10. العقارات والممتلكات =====

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    property_type VARCHAR(100), -- 'residential', 'commercial', etc
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    size_sqm DECIMAL(10, 2),
    bedrooms INT,
    bathrooms INT,
    price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'SAR',
    status VARCHAR(50), -- 'available', 'rented', 'sold'
    owner_id UUID REFERENCES contacts(id),
    tenant_id UUID REFERENCES contacts(id),
    images JSONB,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_org ON properties(org_id);
CREATE INDEX idx_properties_status ON properties(status);

-- ===== 11. الخدمات والمشاريع =====

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    status VARCHAR(50), -- 'active', 'maintenance', 'disabled'
    endpoint_url VARCHAR(500),
    health_check_url VARCHAR(500),
    last_health_check TIMESTAMP,
    is_healthy BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== 12. الإشعارات =====

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    org_id UUID REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50), -- 'info', 'warning', 'error', 'success'
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ===== 13. سجل التدقيق (Audit Log) =====

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete'
    entity_type VARCHAR(100) NOT NULL, -- 'contact', 'workflow', etc
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ===== 14. الجلسات =====

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ===== Views =====

-- عرض معلومات المستخدمين في المنظمة
CREATE VIEW IF NOT EXISTS org_users_view AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    om.org_id,
    om.role,
    u.created_at
FROM users u
JOIN org_members om ON u.id = om.user_id;

-- عرض إحصائيات المنظمة
CREATE VIEW IF NOT EXISTS org_stats_view AS
SELECT 
    o.id,
    o.name,
    COUNT(DISTINCT om.user_id) as total_members,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT d.id) as total_deals,
    COUNT(DISTINCT p.id) as total_properties,
    COUNT(DISTINCT w.id) as total_workflows
FROM organizations o
LEFT JOIN org_members om ON o.id = om.org_id
LEFT JOIN contacts c ON o.id = c.org_id
LEFT JOIN deals d ON o.id = d.org_id
LEFT JOIN properties p ON o.id = p.org_id
LEFT JOIN workflows w ON o.id = w.org_id
GROUP BY o.id, o.name;
