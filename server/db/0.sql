CREATE TABLE migration (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(255) NOT NULL,
    data text NOT NULL,
    executed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT migration_name_key UNIQUE (name)
);
