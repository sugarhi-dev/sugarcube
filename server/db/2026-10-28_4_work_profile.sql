CREATE TABLE work_profile (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    discipline_id varchar(26) NOT NULL,
    position_id varchar(26) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT work_profile_user_position_key UNIQUE (user_profile_id, position_id),
    CONSTRAINT work_profile_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT work_profile_discipline_id_fkey
        FOREIGN KEY (discipline_id) REFERENCES disciplines (id) ON DELETE RESTRICT,
    CONSTRAINT work_profile_position_id_fkey
        FOREIGN KEY (position_id) REFERENCES positions (id) ON DELETE RESTRICT
);

CREATE INDEX work_profile_discipline_id_idx
    ON work_profile (discipline_id);

CREATE INDEX work_profile_position_id_idx
    ON work_profile (position_id);
