ALTER TABLE user_media
    ADD COLUMN stream_url text,
    ADD CONSTRAINT user_media_stream_url_check CHECK (
        stream_url IS NULL OR (
            char_length(stream_url) BETWEEN 1 AND 2048
            AND stream_url ~ '^https://'
        )
    );
