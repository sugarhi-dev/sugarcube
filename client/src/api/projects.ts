import { ProjectProjectTypeSchema, ProjectSchema, type Project, type ProjectProjectType } from '@sugarcube/schema';
import { apiJson } from './http.ts';
import { parseResponse, parseResponseList } from './parse.ts';

export type { Project, ProjectProjectType };

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
    return parseResponseList(ProjectSchema, body, 'Projects response was not valid.');
}

async function readProject(accessToken: string, path: string, init?: RequestInit): Promise<Project> {
    const body = await apiJson(accessToken, path, init);
    return parseResponse(ProjectSchema, body, 'Project response was not valid.');
}

async function readProjectProjectTypes(
    accessToken: string,
    path: string,
    init?: RequestInit,
): Promise<ProjectProjectType[]> {
    const body = await apiJson(accessToken, path, init);
    return parseResponseList(ProjectProjectTypeSchema, body, 'Project types response was not valid.');
}
