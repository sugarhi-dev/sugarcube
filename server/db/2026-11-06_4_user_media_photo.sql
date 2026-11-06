ALTER TABLE user_media
    DROP CONSTRAINT user_media_media_type_check;

ALTER TABLE user_media
    ADD CONSTRAINT user_media_media_type_check CHECK (
        media_type IN ('youtube', 'vimeo', 'upload', 'photo')
    );
