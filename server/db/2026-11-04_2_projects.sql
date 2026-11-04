ALTER TABLE projects
    ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN production_company text,
    ADD COLUMN hiring_producer text;

ALTER TABLE projects
    ALTER COLUMN date DROP DEFAULT;
