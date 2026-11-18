ALTER TABLE user_media
    ADD COLUMN status varchar(16) NOT NULL DEFAULT 'live',
    ADD CONSTRAINT user_media_status_check CHECK (
        status IN ('review', 'live', 'invisible')
    );
