export interface Credentials {
    vid: string;
    accessToken?: string;
    refreshToken: string;
    deviceId: string;
}
export interface LoadCredentialsOptions {
    credentials?: Partial<Credentials>;
    env?: NodeJS.ProcessEnv;
    store?: string;
}
export interface SaveCredentialsOptions {
    env?: NodeJS.ProcessEnv;
    store?: string;
}
/** Resolve the credential file for a store name, or the unsuffixed default when none is given. */
export declare function storePath(env?: NodeJS.ProcessEnv, store?: string): string;
export declare function loadCredentials(options?: LoadCredentialsOptions): Credentials;
export declare function saveCredentials(credentials: Credentials, options?: SaveCredentialsOptions): void;
