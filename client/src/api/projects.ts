import { ApiError, apiJson } from './http.ts';

export type Project = {
    id: string;
    user_profile_id: string;
    name: string;
    position_id: string;
    lead_producer_name: string;
};

export type ProjectInput = {
    name: string;
    position_id: string;
    lead_producer_name: string;
};

export function listProjects(accessToken: string): Promise<Project[]> {
    return readProjects(accessToken, '/api/me/projects');
}

export function createProject(accessToken: string, input: ProjectInput): Promise<Project> {
    return readProject(accessToken, '/api/me/projects', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function updateProject(accessToken: string, id: string, input: ProjectInput): Promise<Project> {
    return readProject(accessToken, `/api/me/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
}

export function deleteProject(accessToken: string, id: string): Promise<Project> {
    return readProject(accessToken, `/api/me/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

export type ProjectProjectType = {
    project_id: string;
    project_type_id: string;
};

export function listProjectProjectTypes(accessToken: string, projectId: string): Promise<ProjectProjectType[]> {
    return readProjectProjectTypes(accessToken, `/api/me/projects/${encodeURIComponent(projectId)}/project-types`);
}

export function updateProjectProjectTypes(
    accessToken: string,
    projectId: string,
    projectTypeIds: string[],
): Promise<ProjectProjectType[]> {
    return readProjectProjectTypes(accessToken, `/api/me/projects/${encodeURIComponent(projectId)}/project-types`, {
        method: 'PUT',
        body: JSON.stringify({ project_type_ids: projectTypeIds }),
    });
}

async function readProjects(accessToken: string, path: string): Promise<Project[]> {
    const body = await apiJson(accessToken, path);
    if (!Array.isArray(body) || !body.every(isProject)) {
        throw new ApiError(502, 'Projects response was not valid.');
    }
    return body;
}

async function readProject(accessToken: string, path: string, init?: RequestInit): Promise<Project> {
    const body = await apiJson(accessToken, path, init);
    if (!isProject(body)) {
        throw new ApiError(502, 'Project response was not valid.');
    }
    return body;
}

async function readProjectProjectTypes(
    accessToken: string,
    path: string,
    init?: RequestInit,
): Promise<ProjectProjectType[]> {
    const body = await apiJson(accessToken, path, init);
    if (!Array.isArray(body) || !body.every(isProjectProjectType)) {
        throw new ApiError(502, 'Project types response was not valid.');
    }
    return body;
}

function isProjectProjectType(value: unknown): value is ProjectProjectType {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row.project_id === 'string' && typeof row.project_type_id === 'string';
}

function isProject(value: unknown): value is Project {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const project = value as Record<string, unknown>;
    return typeof project.id === 'string'
        && typeof project.user_profile_id === 'string'
        && typeof project.name === 'string'
        && typeof project.position_id === 'string'
        && typeof project.lead_producer_name === 'string';
}
