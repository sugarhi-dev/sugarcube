ALTER TABLE user_account
    DROP CONSTRAINT user_account_status_check;

ALTER TABLE user_account
    ADD CONSTRAINT user_account_status_check CHECK (
        status IN ('new', 'basic', 'setup', 'experience', 'media', 'review', 'admin-review', 'live', 'invisible', 'deactivated')
    );
