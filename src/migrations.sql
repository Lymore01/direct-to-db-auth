BEGIN;
-- create application roles
CREATE ROLE app_anon NOLOGIN;
CREATE ROLE app_authenticated NOLOGIN;

-- create web app login role and grant access to the application roles
CREATE ROLE app_pooler WITH LOGIN PASSWORD 'app_pooler_password';
GRANT app_anon TO app_pooler;
GRANT app_authenticated TO app_pooler;

-- create helper function to get the current user id from the JWT claims
CREATE OR REPLACE FUNCTION current_app_user_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::uuid;
$$;

-- create example protected table
CREATE TABLE user_notes(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);

-- enable RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_notes TO app_authenticated;

-- define RLS policy for authenticated users
CREATE POLICY user_notes_isolation ON user_notes
    FOR ALL
    TO app_authenticated
    USING (user_id = current_app_user_id())
    WITH CHECK (user_id = current_app_user_id());

COMMIT;