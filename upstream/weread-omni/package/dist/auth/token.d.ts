import { type Logger } from "../logger.js";
import { type ClientProfile } from "../profile.js";
import type { Credentials } from "./credentials.js";
export interface AccessToken {
    vid: string;
    accessToken: string;
    refreshToken: string;
}
export interface MintAccessTokenOptions {
    timeoutMs?: number;
    baseUrl?: string;
    profile?: ClientProfile;
    /**
     * Cancels the mint itself. Only safe when this mint has exactly one waiter —
     * `TokenManager` deliberately does not forward a caller's signal here, because its mint is
     * shared and one caller aborting must not cancel it for the others.
     */
    signal?: AbortSignal;
}
export declare function mintAccessToken(credentials: Credentials, fetchImpl?: typeof fetch, options?: MintAccessTokenOptions): Promise<AccessToken>;
export interface TokenManagerOptions {
    fetchImpl?: typeof fetch;
    onCredentials?: (credentials: Credentials) => void | Promise<void>;
    timeoutMs?: number;
    baseUrl?: string;
    profile?: ClientProfile;
    logger?: Logger;
}
export declare class TokenManager {
    private credentials;
    private cached?;
    private pending?;
    private credentialsToPersist?;
    private pendingPersistence?;
    private readonly fetchImpl;
    private readonly onCredentials?;
    private readonly timeoutMs;
    private readonly baseUrl?;
    private readonly profile;
    private readonly logger?;
    constructor(credentials: Credentials, options?: TokenManagerOptions);
    /**
     * `signal` cancels *this caller's wait*, never the mint.
     *
     * The mint is single-flight: several requests share one in-flight `/login`. Forwarding a
     * caller's signal into it would let whoever aborts first cancel a mint the other waiters are
     * still depending on — and the token it would have cached, and the credential rotation it
     * would have persisted. So an aborting caller only stops listening; the mint runs to
     * completion for everybody else.
     *
     * The same rule covers the persistence retry on the cached path below. `onCredentials` is
     * user-supplied and may be arbitrarily slow (a network-backed secret store, say), and it is
     * shared the same way the mint is — so an aborting caller stops waiting on it, and the write
     * still lands for everyone else.
     */
    get(force?: boolean, signal?: AbortSignal): Promise<AccessToken>;
    private release;
    private mint;
    private persistCredentials;
    private retryPersistence;
}
