ALTER TABLE user_profile
    ADD COLUMN title text,
    ADD CONSTRAINT user_profile_title_check CHECK (
        title IS NULL OR char_length(title) <= 120
    );
