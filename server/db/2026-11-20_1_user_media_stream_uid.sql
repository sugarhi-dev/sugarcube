ALTER TABLE user_media
    ADD COLUMN stream_uid varchar(32),
    ADD CONSTRAINT user_media_stream_uid_check CHECK (
        stream_uid IS NULL OR stream_uid ~ '^[0-9a-f]{32}$'
    );

CREATE UNIQUE INDEX user_media_stream_uid_key
    ON user_media (stream_uid)
    WHERE stream_uid IS NOT NULL;

CREATE INDEX user_media_upload_awaiting_stream_idx
    ON user_media (created_at)
    WHERE media_type = 'upload'
      AND stream_uid IS NULL
      AND status IS DISTINCT FROM 'ready';
