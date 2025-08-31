-- Hansee   Database Schema
-- PostgreSQL 15+ compatible

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 면접 이벤트 테이블
CREATE TABLE interview_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    organizer_name VARCHAR(255) NOT NULL,
    organizer_email VARCHAR(255) NOT NULL,
    interview_length INTEGER NOT NULL CHECK (interview_length > 0), -- 분 단위
    simultaneous_count INTEGER NOT NULL DEFAULT 1 CHECK (simultaneous_count > 0),
    deadline TIMESTAMPTZ NOT NULL,
    
    -- 리마인더 설정 (JSON)
    reminder_settings JSONB NOT NULL DEFAULT '{
        "oneDayBefore": true,
        "threeHoursBefore": true,
        "oneHourBefore": false
    }'::jsonb,
    
    -- 발송 옵션 (JSON)
    send_options JSONB NOT NULL DEFAULT '{
        "sendEmail": true,
        "generateLink": false
    }'::jsonb,
    
    -- 시간 범위 설정 (JSON)
    time_range JSONB NOT NULL DEFAULT '{
        "startTime": "09:00",
        "endTime": "18:00"
    }'::jsonb,
    
    -- 상태
    status VARCHAR(20) NOT NULL DEFAULT 'collecting' 
        CHECK (status IN ('collecting', 'closed', 'scheduled', 'completed', 'failed')),
    
    -- 공유 토큰 (링크 생성용)
    share_token VARCHAR(255) UNIQUE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 인덱스
    CONSTRAINT valid_deadline CHECK (deadline > created_at)
);

-- 가용 시간 슬롯 테이블
CREATE TABLE available_time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 복합 인덱스 및 제약조건
    UNIQUE(event_id, date, start_time),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 지원자 테이블
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    
    -- 응답 관련
    has_responded BOOLEAN NOT NULL DEFAULT FALSE,
    response_token VARCHAR(255) UNIQUE NOT NULL, -- 보안 응답 토큰
    responded_at TIMESTAMPTZ,
    
    -- 추가 정보 (JSON으로 확장 가능)
    additional_info JSONB DEFAULT '{}'::jsonb,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 복합 유니크 (같은 이벤트에 동일 이메일 불가)
    UNIQUE(event_id, email),
    UNIQUE(event_id, phone)
);

-- 지원자 선택 시간 테이블
CREATE TABLE candidate_time_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    selected_date DATE NOT NULL,
    selected_start_time TIME NOT NULL,
    selected_end_time TIME NOT NULL,
    preference_order INTEGER DEFAULT 1, -- 선호도 순서 (1이 가장 선호)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 복합 유니크 (같은 시간대 중복 선택 방지)
    UNIQUE(candidate_id, selected_date, selected_start_time),
    CONSTRAINT valid_time_slot CHECK (selected_end_time > selected_start_time)
);

-- 최종 배정된 면접 일정 테이블
CREATE TABLE scheduled_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- 배정된 일정
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    
    -- 세션 ID (동시 면접을 위한 그룹핑)
    session_id VARCHAR(50) NOT NULL,
    
    -- 상태 및 추가 정보
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    meeting_link VARCHAR(500), -- Zoom, Teams 등 화상회의 링크
    meeting_room VARCHAR(100), -- 물리적 회의실 정보
    interviewer_notes TEXT, -- 면접관 메모
    
    -- 알림 발송 이력
    confirmation_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 복합 유니크 (같은 지원자는 하나의 면접만)
    UNIQUE(event_id, candidate_id),
    CONSTRAINT valid_schedule_time CHECK (scheduled_end_time > scheduled_start_time)
);

-- 이메일 발송 로그 테이블
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES interview_events(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    
    -- 이메일 정보
    email_type VARCHAR(50) NOT NULL 
        CHECK (email_type IN ('invitation', 'reminder', 'confirmation', 'scheduled', 'cancelled')),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    
    -- 발송 상태
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- 외부 서비스 정보
    external_message_id VARCHAR(255), -- SendGrid, SES 등의 메시지 ID
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- 타임스탬프
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 시스템 설정 테이블 (나중에 관리자 기능용)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 감사 로그 테이블 (중요 작업 추적용)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_email VARCHAR(255), -- 작업 수행자
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_interview_events_organizer ON interview_events(organizer_email);
CREATE INDEX idx_interview_events_status ON interview_events(status);
CREATE INDEX idx_interview_events_deadline ON interview_events(deadline);

CREATE INDEX idx_available_time_slots_event_date ON available_time_slots(event_id, date);

CREATE INDEX idx_candidates_event ON candidates(event_id);
CREATE INDEX idx_candidates_response_token ON candidates(response_token);
CREATE INDEX idx_candidates_responded ON candidates(has_responded);

CREATE INDEX idx_candidate_selections_candidate ON candidate_time_selections(candidate_id);
CREATE INDEX idx_candidate_selections_date_time ON candidate_time_selections(selected_date, selected_start_time);

CREATE INDEX idx_scheduled_interviews_event ON scheduled_interviews(event_id);
CREATE INDEX idx_scheduled_interviews_candidate ON scheduled_interviews(candidate_id);
CREATE INDEX idx_scheduled_interviews_date ON scheduled_interviews(scheduled_date);
CREATE INDEX idx_scheduled_interviews_status ON scheduled_interviews(status);

CREATE INDEX idx_email_logs_event ON email_logs(event_id);
CREATE INDEX idx_email_logs_candidate ON email_logs(candidate_id);
CREATE INDEX idx_email_logs_type_status ON email_logs(email_type, status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 적용
CREATE TRIGGER update_interview_events_updated_at 
    BEFORE UPDATE ON interview_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_interviews_updated_at 
    BEFORE UPDATE ON scheduled_interviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 감사 로그 트리거 함수 (선택적)
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 기본 시스템 설정 데이터 삽입
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('email_templates', '{
    "invitation": {
        "subject": "면접 일정 선택 요청 - {{eventName}}",
        "template": "안녕하세요 {{candidateName}}님, {{eventName}} 면접 일정을 선택해 주세요."
    },
    "confirmation": {
        "subject": "면접 일정 확정 알림 - {{eventName}}",
        "template": "{{candidateName}}님의 면접이 {{scheduleDate}} {{scheduleTime}}에 확정되었습니다."
    }
}', '이메일 템플릿 설정'),
('default_time_slots', '{
    "startTime": "09:00",
    "endTime": "18:00",
    "slotDuration": 30
}', '기본 시간 슬롯 설정'),
('notification_settings', '{
    "maxRetries": 3,
    "retryInterval": 300,
    "enableSMS": false
}', '알림 관련 설정');

COMMENT ON TABLE interview_events IS '면접 이벤트 메인 테이블';
COMMENT ON TABLE available_time_slots IS '면접 가능한 시간 슬롯';
COMMENT ON TABLE candidates IS '면접 지원자 정보';
COMMENT ON TABLE candidate_time_selections IS '지원자가 선택한 선호 시간';
COMMENT ON TABLE scheduled_interviews IS '최종 배정된 면접 일정';
COMMENT ON TABLE email_logs IS '이메일 발송 이력';
COMMENT ON TABLE system_settings IS '시스템 설정';
COMMENT ON TABLE audit_logs IS '감사 로그 (데이터 변경 이력)';