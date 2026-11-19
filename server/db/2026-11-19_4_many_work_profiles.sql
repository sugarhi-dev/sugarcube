ALTER TABLE user_work_profile
    ADD COLUMN status varchar(16);

UPDATE user_work_profile AS work
SET status = CASE
    WHEN account.status = 'admin-review' THEN 'admin-review'
    WHEN account.status IN ('live', 'invisible', 'deactivated') THEN 'live'
    ELSE 'draft'
END
FROM user_account AS account
WHERE account.id = work.user_account_id
  AND work.status IS NULL;

ALTER TABLE user_work_profile
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'draft',
    ADD CONSTRAINT user_work_profile_status_check CHECK (
        status IN ('draft', 'admin-review', 'live')
    );

ALTER TABLE user_account
    ADD COLUMN viewing_work_profile_id varchar(26);

UPDATE user_account AS account
SET viewing_work_profile_id = work.id
FROM user_work_profile AS work
WHERE work.user_account_id = account.id
  AND account.viewing_work_profile_id IS NULL;

ALTER TABLE user_account
    ADD CONSTRAINT user_account_viewing_work_profile_id_fkey
        FOREIGN KEY (viewing_work_profile_id) REFERENCES user_work_profile (id) ON DELETE RESTRICT;

ALTER TABLE user_locale
    ADD COLUMN user_work_profile_id varchar(26);

UPDATE user_locale AS locale
SET user_work_profile_id = work.id
FROM user_work_profile AS work
WHERE work.user_account_id = locale.user_account_id
  AND locale.user_work_profile_id IS NULL;

ALTER TABLE user_locale
    ALTER COLUMN user_work_profile_id SET NOT NULL,
    ADD CONSTRAINT user_locale_user_work_profile_id_fkey
        FOREIGN KEY (user_work_profile_id) REFERENCES user_work_profile (id) ON DELETE RESTRICT;

ALTER TABLE user_locale
    DROP CONSTRAINT user_locale_user_city_key;

DROP INDEX user_locale_home_city_key;

ALTER TABLE user_locale
    ADD CONSTRAINT user_locale_work_profile_city_key UNIQUE (user_work_profile_id, production_city_id);

CREATE UNIQUE INDEX user_locale_work_profile_home_city_key
    ON user_locale (user_work_profile_id)
    WHERE home_city;

CREATE INDEX user_locale_user_work_profile_id_idx
    ON user_locale (user_work_profile_id);

ALTER TABLE user_media
    ADD COLUMN user_work_profile_id varchar(26);

UPDATE user_media AS media
SET user_work_profile_id = work.id
FROM user_work_profile AS work
WHERE work.user_account_id = media.user_account_id
  AND media.user_work_profile_id IS NULL;

ALTER TABLE user_media
    ALTER COLUMN user_work_profile_id SET NOT NULL,
    ADD CONSTRAINT user_media_user_work_profile_id_fkey
        FOREIGN KEY (user_work_profile_id) REFERENCES user_work_profile (id) ON DELETE RESTRICT;

CREATE INDEX user_media_user_work_profile_sort_order_idx
    ON user_media (user_work_profile_id, sort_order);

ALTER TABLE projects
    ADD COLUMN user_work_profile_id varchar(26);

UPDATE projects AS project
SET user_work_profile_id = work.id
FROM user_work_profile AS work
WHERE work.user_account_id = project.user_account_id
  AND project.user_work_profile_id IS NULL;

ALTER TABLE projects
    ALTER COLUMN user_work_profile_id SET NOT NULL,
    ADD CONSTRAINT projects_user_work_profile_id_fkey
        FOREIGN KEY (user_work_profile_id) REFERENCES user_work_profile (id) ON DELETE RESTRICT;

CREATE INDEX projects_user_work_profile_id_idx
    ON projects (user_work_profile_id);

ALTER TABLE user_availability
    ADD COLUMN user_work_profile_id varchar(26);

UPDATE user_availability AS availability
SET user_work_profile_id = work.id
FROM user_work_profile AS work
WHERE work.user_account_id = availability.user_account_id
  AND availability.user_work_profile_id IS NULL;

ALTER TABLE user_availability
    ALTER COLUMN user_work_profile_id SET NOT NULL,
    ADD CONSTRAINT user_availability_user_work_profile_id_fkey
        FOREIGN KEY (user_work_profile_id) REFERENCES user_work_profile (id) ON DELETE RESTRICT;

CREATE INDEX user_availability_user_work_profile_id_idx
    ON user_availability (user_work_profile_id);

ALTER TABLE user_work_profile
    DROP CONSTRAINT user_work_profile_user_account_id_key;

CREATE INDEX user_work_profile_user_account_id_idx
    ON user_work_profile (user_account_id);
