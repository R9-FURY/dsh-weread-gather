/** Shared typed failures for the public request and authentication planes. */
export declare class WeReadError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * A response-level failure, including business errors and unusable responses.
 *
 * One class, one name. This used to be `ApiError` here with an empty
 * `class WeReadApiError extends ApiError {}` in `src/api/mobile.ts`, so the same failure had two
 * public names exported from two modules: the READMEs and the error-code table documented one, the
 * root export list offered both, and a consumer who caught the wrong one caught nothing — every
 * throw in `src/` was always the subclass.
 */
export declare class WeReadApiError extends WeReadError {
    readonly status: number;
    readonly path: string;
    readonly errCode?: number;
    /**
     * The request may have been applied upstream even though it failed here, so it must not be
     * retried automatically. Mirrors `ImportPhaseError.ambiguous`.
     */
    readonly ambiguous: boolean;
    constructor(message: string, info: {
        status: number;
        path: string;
        errCode?: number;
        ambiguous?: boolean;
        cause?: unknown;
    });
}
/** Authentication lifecycle failure. */
export declare class AuthError extends WeReadError {
}
/** Network, cancellation, or timeout failure. */
export declare class TransportError extends WeReadError {
    /**
     * No response was ever read, and the request was not safe to send twice — so it may have been
     * applied upstream even though it failed here, and must not be retried automatically. Mirrors
     * `WeReadApiError.ambiguous` and `ImportPhaseError.ambiguous`.
     *
     * Deliberately narrow. A timed-out GET is a plain failure and stays `false`: a flag that is set
     * on failures the caller could already classify teaches the caller to ignore it.
     */
    readonly ambiguous: boolean;
    constructor(message: string, options?: {
        cause?: unknown;
        ambiguous?: boolean;
    });
}
/**
 * Classify an arbitrary thrown value as a transport failure.
 *
 * `ambiguous` is the caller's to declare, because only the caller knows whether the request that
 * was lost was safe to repeat — the thrown value carries no evidence either way.
 */
export declare function toTransportError(error: unknown, label: string, options?: {
    ambiguous?: boolean;
}): TransportError;
