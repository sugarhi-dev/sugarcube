ALTER TABLE user_media
    DROP CONSTRAINT user_media_status_check;

ALTER TABLE user_media
    ALTER COLUMN status DROP NOT NULL,
    ALTER COLUMN status DROP DEFAULT;

UPDATE user_media
SET status = NULL
WHERE status IS DISTINCT FROM 'pending'
  AND status IS DISTINCT FROM 'ready';

ALTER TABLE user_media
    ADD CONSTRAINT user_media_status_check CHECK (
        status IS NULL OR status IN ('pending', 'ready')
    );
