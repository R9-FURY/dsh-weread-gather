import type { AccessToken } from "../auth/token.js";
import { type Logger } from "../logger.js";
import { type ClientProfile } from "../profile.js";
export interface TokenProvider {
    /**
     * `signal` aborts the caller's wait for a token. Implementations that share one mint between
     * callers must not use it to cancel that mint — see `TokenManager.get`.
     */
    get(force?: boolean, signal?: AbortSignal): Promise<AccessToken>;
}
export type QueryValue = string | number | boolean | undefined;
export interface MobileCallOptions {
    query?: Record<string, QueryValue>;
    body?: unknown;
    signal?: AbortSignal;
    /**
     * Safe to send twice. GET and HEAD qualify automatically; a POST that is semantically a read
     * must opt in. Anything else is refused rather than replayed after an auth failure, because a
     * write can be committed upstream and still answer 401.
     */
    idempotent?: boolean;
}
/** @internal Endpoint-specific transport policy used by curated resource modules. */
export interface MobileTransportCallOptions extends MobileCallOptions {
    acceptArrayResponse?: boolean;
    treatExpiredSessionAsBusinessError?: boolean;
}
export interface RawMobileCallOptions extends MobileCallOptions {
    /** Reject a response before retaining more than this many body bytes. */
    maxResponseBytes?: number;
}
export interface MobileResponse<T> {
    status: number;
    headers: Headers;
    body: T;
}
export interface MobileClientOptions {
    tokenManager: TokenProvider;
    fetchImpl?: typeof fetch;
    baseUrl?: string;
    timeoutMs?: number;
    profile?: ClientProfile;
    logger?: Logger;
}
export declare class MobileClient {
    private readonly tokenManager;
    private readonly fetchImpl;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly logger?;
    private readonly versionHeaders;
    private readonly authHeaders;
    constructor(options: MobileClientOptions);
    vid(signal?: AbortSignal): Promise<string>;
    /**
     * Resolve the token to retry an auth-rejected first attempt with, or refuse the retry.
     *
     * A write can be committed upstream and still answer 401 (or errCode -2012 on an HTTP 200),
     * so replaying it duplicates the write. Whether the refreshed token differs proves nothing
     * about that: the token being stale and the write having landed are independent events.
     */
    private tokenForReplay;
    /**
     * Issue a request and return its parsed JSON body as `T`.
     *
     * `T` describes the parsed body and nothing changes that. Byte-returning calls go through
     * `callRaw`, which is a separate method rather than a `raw: true` flag precisely so this
     * generic cannot lie: `call<Foo>(…, { raw: true })` used to type-check and hand back a
     * `Uint8Array`, because the flag and the type parameter were independent.
     */
    call<T = unknown>(method: string, path: string, options?: MobileCallOptions): Promise<MobileResponse<T>>;
    /**
     * Issue a request and return its body as bytes, for responses that are not JSON — a cover
     * image, an EPUB.
     *
     * Business-code handling still applies: a body that is in fact a WeRead error envelope is
     * rejected, and an expired session replays once, exactly as on `call`. See `businessEnvelope`
     * for how a genuine binary asset is told apart from an envelope.
     */
    callRaw(method: string, path: string, options?: RawMobileCallOptions): Promise<MobileResponse<Uint8Array>>;
    private loggedRequest;
    private request;
}
