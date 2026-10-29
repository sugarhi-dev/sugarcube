CREATE TABLE project_project_type (
    project_id varchar(26) NOT NULL,
    project_type_id varchar(26) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_project_type_pkey PRIMARY KEY (project_id, project_type_id),
    CONSTRAINT project_project_type_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT,
    CONSTRAINT project_project_type_project_type_id_fkey
        FOREIGN KEY (project_type_id) REFERENCES project_type (id) ON DELETE RESTRICT
);

CREATE INDEX project_project_type_project_type_id_idx
    ON project_project_type (project_type_id);
