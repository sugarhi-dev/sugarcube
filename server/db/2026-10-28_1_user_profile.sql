ALTER TABLE user_profile
    ADD COLUMN status varchar(16) NOT NULL DEFAULT 'new',
    ADD CONSTRAINT user_profile_status_check CHECK (
        status IN ('new', 'setup', 'experience', 'media', 'review', 'live', 'invisible')
    );
