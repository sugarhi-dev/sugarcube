ALTER TABLE user_profile
    ADD COLUMN account_type varchar(16),
    ADD CONSTRAINT user_profile_account_type_check CHECK (
        account_type IS NULL OR account_type IN ('client', 'crew')
    );
