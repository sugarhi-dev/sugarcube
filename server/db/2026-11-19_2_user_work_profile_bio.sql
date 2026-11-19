ALTER TABLE user_account
    DROP CONSTRAINT user_account_bio_check;

ALTER TABLE user_account
    DROP COLUMN bio;

ALTER TABLE user_work_profile
    ADD COLUMN bio text,
    ADD CONSTRAINT user_work_profile_bio_check CHECK (
        bio IS NULL OR char_length(bio) <= 300
    );
