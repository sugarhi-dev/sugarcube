ALTER TABLE user_media
    ADD COLUMN thumbnail varchar(26),
    ADD CONSTRAINT user_media_thumbnail_check CHECK (
        thumbnail IS NULL OR thumbnail ~ '^[0-9A-HJKMNP-TV-Z]{26}$'
    );
