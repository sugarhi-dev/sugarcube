ALTER TABLE user_profile
    DROP CONSTRAINT user_profile_status_check;

ALTER TABLE user_profile
    ADD CONSTRAINT user_profile_status_check CHECK (
        status IN ('new', 'basic', 'setup', 'experience', 'media', 'review', 'admin-review', 'live', 'invisible')
    );
