import type { CanonicalClient } from "./api/client.js";
import type { ExtendStoreProgram } from "./cli.js";
export declare const CLIENT_PLUGIN_API_VERSION: 1;
export declare const CLIENT_ID_PATTERN: RegExp;
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
export interface ClientIdentity {
    vid: string;
    deviceId?: string;
}
export interface ClientLoginContext {
    previousState?: JsonValue;
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
    signal?: AbortSignal;
    onQr(url: string, stage?: string): Promise<void> | void;
    onStatus(status: string, stage?: string): Promise<void> | void;
    onOtp(): Promise<string> | string;
}
export interface ClientOpenContext {
    state: JsonValue;
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
    saveState(state: JsonValue): Promise<void>;
}
export interface ClientLoginResult {
    state: JsonValue;
    identity: ClientIdentity;
}
/**
 * API v1 plugins may predate `search.suggest`. The account boundary adapts that one missing
 * operation before exposing the full canonical client to callers.
 */
type PluginCanonicalClient = Omit<CanonicalClient, "search"> & {
    readonly search: Omit<CanonicalClient["search"], "suggest"> & Partial<Pick<CanonicalClient["search"], "suggest">>;
};
export interface ClientOpenResult {
    client: PluginCanonicalClient;
    identity: ClientIdentity;
}
export interface ClientProvider {
    login(context: ClientLoginContext): Promise<ClientLoginResult>;
    open(context: ClientOpenContext): Promise<ClientOpenResult>;
}
export interface ClientPlugin {
    meta: {
        name: string;
        version: string;
        apiVersion: typeof CLIENT_PLUGIN_API_VERSION;
    };
    clients: Readonly<Record<string, ClientProvider>>;
    /**
     * Register commands that operate on the account selected by the core CLI.
     *
     * Optional so existing API-v1 client-only plugins remain compatible.
     */
    cli?: ExtendStoreProgram;
}
export interface RegisteredClient {
    id: string;
    provider: ClientProvider;
    plugin: ClientPlugin["meta"];
}
export declare function validateClientPlugin(value: unknown, source?: string): ClientPlugin;
export declare function registerClientPlugins(builtins: Readonly<Record<string, ClientProvider>>, plugins: readonly ClientPlugin[]): ReadonlyMap<string, RegisteredClient>;
export declare function pluginSpecifiers(env?: NodeJS.ProcessEnv): string[];
export declare function loadClientPlugins(specifiers: readonly string[]): Promise<ClientPlugin[]>;
export declare function assertCanonicalClient(value: unknown, label?: string): asserts value is CanonicalClient;
export {};
