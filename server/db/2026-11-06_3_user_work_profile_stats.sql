ALTER TABLE user_work_profile
    ADD COLUMN projects_completed integer,
    ADD COLUMN years_in_business integer,
    ADD COLUMN response_time_hours integer,
    ADD CONSTRAINT user_work_profile_projects_completed_check CHECK (
        projects_completed IS NULL OR projects_completed >= 0
    ),
    ADD CONSTRAINT user_work_profile_years_in_business_check CHECK (
        years_in_business IS NULL OR years_in_business >= 0
    ),
    ADD CONSTRAINT user_work_profile_response_time_hours_check CHECK (
        response_time_hours IS NULL OR response_time_hours >= 1
    );
