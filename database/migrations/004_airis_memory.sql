-- ================================================================
-- Migration 004: Airis - Persistent Sessions + Long-Term Memory
-- ================================================================

-- جلسات المحادثة الدائمة
CREATE TABLE IF NOT EXISTS airis_sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('user','assistant')),
    content     TEXT         NOT NULL,
    source      VARCHAR(20),
    mode        VARCHAR(20)  DEFAULT 'formal',
    emotion     JSONB        DEFAULT '{}',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airis_sessions_sid
    ON airis_sessions(session_id, created_at);

-- الذكريات المستخرجة طويلة الأمد
CREATE TABLE IF NOT EXISTS airis_memories (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    content          TEXT    NOT NULL,
    importance       INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    times_recalled   INTEGER DEFAULT 0,
    last_recalled_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airis_memories_rank
    ON airis_memories(importance DESC, times_recalled DESC);
