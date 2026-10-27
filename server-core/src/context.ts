import { ulid } from "ulidx";

export class Context {
    private _traceId: string;
    private _userError: string;
    private _userErrorStatusCode: number;
    private _hasError: boolean;

    public get traceId(): string {
        return this._traceId;
    }

    public get userError(): string {
        return this._userError;
    }

    public get userErrorStatusCode(): number {
        return this._userErrorStatusCode;
    }

    public get hasError(): boolean {
        return this._hasError;
    }    

    constructor() {
        this._traceId = ulid();
        this._userError = '';
        this._userErrorStatusCode = 0;
        this._hasError = false;        
    }

    public error(message: string, statusCode: number) {
        this._userError = message;
        this._userErrorStatusCode = statusCode;
        this._hasError = true;
    }
}