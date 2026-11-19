ALTER TABLE user_account
    DROP CONSTRAINT user_account_title_check;

ALTER TABLE user_account
    DROP COLUMN title;

ALTER TABLE user_work_profile
    ADD COLUMN title text,
    ADD CONSTRAINT user_work_profile_title_check CHECK (
        title IS NULL OR char_length(title) <= 120
    );
