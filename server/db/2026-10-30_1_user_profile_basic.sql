ALTER TABLE user_profile
    DROP CONSTRAINT user_profile_status_check;

ALTER TABLE user_profile
    ADD CONSTRAINT user_profile_status_check CHECK (
        status IN ('new', 'basic', 'setup', 'experience', 'media', 'review', 'live', 'invisible')
    );

ALTER TABLE user_profile
    ADD COLUMN bio text,
    ADD CONSTRAINT user_profile_bio_check CHECK (
        bio IS NULL OR char_length(bio) <= 1200
    );
