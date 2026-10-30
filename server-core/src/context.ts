import { ulid } from "ulidx";

export class Context {
    readonly #traceId = ulid();
    #userError = '';
    #userErrorStatusCode = 0;
    #hasError = false;

    public get traceId(): string {
        return this.#traceId;
    }

    public get userError(): string {
        return this.#userError;
    }

    public get userErrorStatusCode(): number {
        return this.#userErrorStatusCode;
    }

    public get hasError(): boolean {
        return this.#hasError;
    }

    public error(message: string, statusCode: number) {
        this.#userError = message;
        this.#userErrorStatusCode = statusCode;
        this.#hasError = true;
    }
}
