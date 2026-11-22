export declare const MAX_JSON_RESPONSE_BYTES: number;
export declare class ResponseBodyTooLargeError extends Error {
}
export declare class ResponseBodyReadError extends Error {
    constructor(cause: unknown);
}
export declare function readResponseBody(response: Response, maxBytes: number): Promise<Uint8Array>;
export declare function readJsonResponse(response: Response): Promise<unknown>;
