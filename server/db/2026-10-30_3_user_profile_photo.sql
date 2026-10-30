ALTER TABLE user_profile
    ADD COLUMN photo varchar(26),
    ADD CONSTRAINT user_profile_photo_check CHECK (
        photo IS NULL OR photo ~ '^[0-9A-HJKMNP-TV-Z]{26}$'
    );
