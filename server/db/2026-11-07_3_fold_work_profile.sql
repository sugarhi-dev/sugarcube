ALTER TABLE user_work_profile
    ADD COLUMN discipline_id varchar(26),
    ADD COLUMN position_id varchar(26);

UPDATE user_work_profile AS profile
SET discipline_id = chosen.discipline_id,
    position_id = chosen.position_id,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (user_account_id)
        user_account_id,
        discipline_id,
        position_id
    FROM work_profile
    ORDER BY user_account_id, created_at, id
) AS chosen
WHERE profile.user_account_id = chosen.user_account_id;

INSERT INTO user_work_profile (
    id,
    user_account_id,
    union_status,
    flat_fee,
    discipline_id,
    position_id
)
SELECT
    chosen.id,
    chosen.user_account_id,
    'either',
    false,
    chosen.discipline_id,
    chosen.position_id
FROM (
    SELECT DISTINCT ON (user_account_id)
        id,
        user_account_id,
        discipline_id,
        position_id
    FROM work_profile
    ORDER BY user_account_id, created_at, id
) AS chosen
WHERE NOT EXISTS (
    SELECT 1
    FROM user_work_profile AS profile
    WHERE profile.user_account_id = chosen.user_account_id
);

ALTER TABLE user_work_profile
    ADD CONSTRAINT user_work_profile_discipline_id_fkey
        FOREIGN KEY (discipline_id) REFERENCES disciplines (id) ON DELETE RESTRICT,
    ADD CONSTRAINT user_work_profile_position_id_fkey
        FOREIGN KEY (position_id) REFERENCES positions (id) ON DELETE RESTRICT,
    ADD CONSTRAINT user_work_profile_position_discipline_fkey
        FOREIGN KEY (position_id, discipline_id)
        REFERENCES positions (id, discipline_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT user_work_profile_position_pair_check CHECK (
        (discipline_id IS NULL AND position_id IS NULL)
        OR (discipline_id IS NOT NULL AND position_id IS NOT NULL)
    );

CREATE INDEX user_work_profile_discipline_id_idx
    ON user_work_profile (discipline_id);

CREATE INDEX user_work_profile_position_id_idx
    ON user_work_profile (position_id);

DROP TABLE work_profile;
