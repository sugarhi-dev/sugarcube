import { apiBase } from '../auth/config.ts';

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function apiJson(accessToken: string, path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
                ...init?.headers,
            },
        });
    } catch {
        throw new ApiError(0, 'Could not reach the Sugarcube API.');
    }

    if (!response.ok) {
        throw new ApiError(response.status, await readError(response));
    }

    try {
        return await response.json() as unknown;
    } catch {
        throw new ApiError(response.status, 'The server response was not valid JSON.');
    }
}

async function readError(response: Response): Promise<string> {
    try {
        return messageFromBody(await response.json() as unknown, response.status);
    } catch {
        return `Request failed (${response.status}).`;
    }
}

function messageFromBody(body: unknown, status: number): string {
    const fallback = `Request failed (${status}).`;
    if (!body || typeof body !== 'object') {
        return fallback;
    }

    const record = body as Record<string, unknown>;
    if (typeof record.error_message === 'string' && record.error_message) {
        return record.error_message;
    }
    if (typeof record.error === 'string' && record.error) {
        return record.error;
    }
    return fallback;
}

export function apiUpload(
    accessToken: string,
    path: string,
    body: Blob,
    contentType: string,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fail = (error: Error) => {
            signal?.removeEventListener('abort', abort);
            reject(error);
        };
        const abort = () => {
            xhr.abort();
        };

        xhr.open('POST', `${apiBase()}${path}`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || event.total <= 0) {
                return;
            }
            onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        };
        xhr.onerror = () => fail(new ApiError(0, 'Could not reach the Sugarcube API.'));
        xhr.onabort = () => fail(new DOMException('The upload was cancelled.', 'AbortError'));
        xhr.onload = () => {
            signal?.removeEventListener('abort', abort);
            let parsed: unknown;
            try {
                parsed = JSON.parse(xhr.responseText) as unknown;
            } catch {
                reject(new ApiError(xhr.status, 'The server response was not valid JSON.'));
                return;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new ApiError(xhr.status, messageFromBody(parsed, xhr.status)));
                return;
            }
            onProgress(100);
            resolve(parsed);
        };

        if (signal) {
            if (signal.aborted) {
                reject(new DOMException('The upload was cancelled.', 'AbortError'));
                return;
            }
            signal.addEventListener('abort', abort);
        }
        xhr.send(body);
    });
}

export async function apiBlob(accessToken: string, path: string): Promise<Blob> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            cache: 'no-store',
            headers: {
                Accept: 'image/jpeg, image/png',
                Authorization: `Bearer ${accessToken}`,
            },
        });
    } catch {
        throw new ApiError(0, 'Could not reach the Sugarcube API.');
    }

    if (!response.ok) {
        throw new ApiError(response.status, await readError(response));
    }

    return response.blob();
}
