CREATE TABLE user_availability (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    code varchar(16) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_availability_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT user_availability_code_check CHECK (
        code IN ('unavailable', 'booked')
    ),
    CONSTRAINT user_availability_date_range_check CHECK (
        to_date >= from_date
    )
);

CREATE INDEX user_availability_user_profile_id_idx
    ON user_availability (user_profile_id);
