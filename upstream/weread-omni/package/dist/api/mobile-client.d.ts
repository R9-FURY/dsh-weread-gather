import { type Credentials } from "../auth/credentials.js";
import { type LoginOptions } from "../auth/qrlogin.js";
import { type TokenManagerOptions } from "../auth/token.js";
import type { Logger } from "../logger.js";
import { type ClientProfile } from "../profile.js";
import { MobileClient } from "./mobile.js";
import { createMobileResources, type MobileResourceDependencies } from "./resources/index.js";
type MobileResources = ReturnType<typeof createMobileResources>;
interface ClientSession {
    mobile: MobileClient;
    resources: MobileResources;
}
/** @internal Captures one mobile session for a multi-call logical operation. */
export declare function captureClientSession(client: object): ClientSession;
/** @internal Lets a wrapping client reuse one underlying mobile session for upload/import flows. */
export declare function registerClientSessionProvider(client: object, provider: () => ClientSession): void;
export interface MobileApiClientOptions {
    credentials?: Credentials;
    env?: NodeJS.ProcessEnv;
    profile?: ClientProfile;
    store?: string;
    fetchImpl?: typeof fetch;
    mobileBaseUrl?: string;
    mobileTimeoutMs?: number;
    logger?: Logger;
    onCredentials?: TokenManagerOptions["onCredentials"];
    resources?: MobileResourceDependencies;
}
export declare class MobileApiClient {
    #private;
    readonly search: MobileResources["search"];
    readonly book: MobileResources["book"];
    readonly shelf: MobileResources["shelf"];
    readonly publicAccounts: MobileResources["publicAccounts"];
    readonly notes: MobileResources["notes"];
    readonly review: MobileResources["review"];
    readonly readData: MobileResources["readData"];
    readonly discover: MobileResources["discover"];
    readonly ai: MobileResources["ai"];
    readonly import: MobileResources["import"];
    constructor(options?: MobileApiClientOptions);
    get mobile(): MobileClient;
    login(options?: ClientLoginOptions): Promise<Credentials>;
    reloadCredentials(): void;
}
export type ClientLoginOptions = Omit<LoginOptions, "profile"> & {
    onCredentials?: (credentials: Credentials) => Promise<void> | void;
};
export type EinkClientOptions = Omit<MobileApiClientOptions, "profile">;
export declare const createEinkClient: (options?: EinkClientOptions) => MobileApiClient;
export {};
