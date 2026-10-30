ALTER TABLE user_media
    ADD COLUMN sort_order integer;

UPDATE user_media
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE user_media
    ALTER COLUMN sort_order SET NOT NULL,
    ADD CONSTRAINT user_media_sort_order_check CHECK (sort_order >= 0);

DROP INDEX user_media_user_profile_id_idx;

CREATE INDEX user_media_user_profile_sort_order_idx
    ON user_media (user_profile_id, sort_order);
