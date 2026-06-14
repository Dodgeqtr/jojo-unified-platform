-- Migration 002: Seed Data
-- تاريخ: June 2026

-- بيانات تجريبية أولية (admin user + منظمة افتراضية + أدوار النظام)

INSERT INTO users (email, first_name, last_name) VALUES
    ('admin@jojo.local', 'Admin', 'User'),
    ('user@jojo.local', 'Test', 'User')
ON CONFLICT (email) DO NOTHING;

INSERT INTO organizations (name, slug, owner_id)
SELECT 'Jojo Main', 'jojo-main', id FROM users WHERE email = 'admin@jojo.local'
ON CONFLICT (slug) DO NOTHING;

-- إضافة الأدوار الافتراضية
INSERT INTO roles (name, permissions, is_system) VALUES
    ('Admin', '["create", "read", "update", "delete", "manage_users"]', true),
    ('Manager', '["create", "read", "update", "manage_own"]', true),
    ('Member', '["read", "create_limited"]', true)
ON CONFLICT DO NOTHING;
