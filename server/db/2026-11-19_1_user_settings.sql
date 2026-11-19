CREATE TABLE user_settings (
    id varchar(26) PRIMARY KEY,
    user_account_id varchar(26) NOT NULL,
    name varchar(64) NOT NULL,
    value varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_settings_user_name_key UNIQUE (user_account_id, name),
    CONSTRAINT user_settings_user_account_id_fkey
        FOREIGN KEY (user_account_id) REFERENCES user_account (id) ON DELETE RESTRICT,
    CONSTRAINT user_settings_name_check CHECK (
        name ~ '^[a-z][a-z0-9_]{0,63}$'
    ),
    CONSTRAINT user_settings_value_check CHECK (
        value = btrim(value) AND char_length(value) > 0
    )
);
