CREATE TABLE user_media (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    media_type varchar(16) NOT NULL,
    url text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_media_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT user_media_media_type_check CHECK (
        media_type IN ('youtube', 'vimeo', 'upload')
    )
);

CREATE INDEX user_media_user_profile_id_idx
    ON user_media (user_profile_id);
