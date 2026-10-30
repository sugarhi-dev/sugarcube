UPDATE user_profile
SET bio = left(bio, 300)
WHERE bio IS NOT NULL AND char_length(bio) > 300;

ALTER TABLE user_profile
    DROP CONSTRAINT user_profile_bio_check;

ALTER TABLE user_profile
    ADD CONSTRAINT user_profile_bio_check CHECK (
        bio IS NULL OR char_length(bio) <= 300
    );
