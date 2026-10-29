CREATE TABLE projects (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    name varchar(255) NOT NULL,
    position_id varchar(26) NOT NULL,
    lead_producer_name text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT projects_position_id_fkey
        FOREIGN KEY (position_id) REFERENCES positions (id) ON DELETE RESTRICT
);

CREATE INDEX projects_user_profile_id_idx
    ON projects (user_profile_id);

CREATE INDEX projects_position_id_idx
    ON projects (position_id);

CREATE TABLE project_type (
    id varchar(26) PRIMARY KEY,
    name varchar(255) NOT NULL,
    discipline_id varchar(26) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_type_name_key UNIQUE (name),
    CONSTRAINT project_type_discipline_id_fkey
        FOREIGN KEY (discipline_id) REFERENCES disciplines (id) ON DELETE RESTRICT,
    CONSTRAINT project_type_discipline_check CHECK (
        discipline_id IN (
            '01M60CTKE77RM4W4MGKQT09GHJ',
            '01M60CTKE7ZPY7X8RBWZERGVZT'
        )
    )
);

CREATE INDEX project_type_discipline_id_idx
    ON project_type (discipline_id);

INSERT INTO project_type (id, name, discipline_id)
VALUES
    -- Shooting: 01M60CTKE77RM4W4MGKQT09GHJ
    ('01M63137AN373050JMM9YBQ73Q', 'Social Content', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AYBFSDMK2QBSGP323Q', 'Podcast', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZ9RBRWQDWVZ9H9EVH', 'Product Demo', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZW7FPF4Z2T68NJZAJ', 'Brand Film', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZ104K11D0HKSNHBPN', 'Tabletop', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZT0465DKC9N238T7Z', 'Music Video', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZVN7BRNXCJY59F00T', 'Feature Film', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137AZBS0VMA3RY1NDKGH0', 'Indie Film', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137B0M335YFGJQWXGRACT', 'TV Show', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137B0KRKPVBANM90EKTSA', 'Longform Art Film', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137B0APD7T79RK8XEHF8J', 'Still Photography', '01M60CTKE77RM4W4MGKQT09GHJ'),
    ('01M63137B0JJQVEWTYDMG6QMA7', 'Commercial', '01M60CTKE77RM4W4MGKQT09GHJ'),
    -- Post Production: 01M60CTKE7ZPY7X8RBWZERGVZT
    ('01M63137B0DKH8Q7NAQWTFE7ZH', 'Stop Motion', '01M60CTKE7ZPY7X8RBWZERGVZT'),
    ('01M63137B01GJGFGWCNFCWRRC1', 'Animated', '01M60CTKE7ZPY7X8RBWZERGVZT'),
    ('01M63137B16JCW0WMPVKH0B14M', 'Visual FX', '01M60CTKE7ZPY7X8RBWZERGVZT'),
    ('01M63137B1CY6X768F45RSQ1RS', 'AI Content', '01M60CTKE7ZPY7X8RBWZERGVZT');
