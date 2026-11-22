import type { CanonicalClient } from "./api/client.js";
import { type ClientIdentity, type ClientLoginContext, type ClientPlugin } from "./plugin.js";
export interface AccountManagerOptions {
    plugins?: readonly ClientPlugin[];
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
}
export interface AccountSummary {
    account: string;
    client: string;
}
export interface ClientSummary {
    client: string;
    plugin: string;
    version: string;
    apiVersion: number;
}
export interface OpenAccount extends AccountSummary {
    canonical: CanonicalClient;
    identity: ClientIdentity;
}
export interface AccountLoginOptions extends Pick<ClientLoginContext, "signal" | "onQr" | "onStatus" | "onOtp"> {
    client?: string;
}
export declare class AccountManager {
    #private;
    constructor(options?: AccountManagerOptions);
    clients(): ClientSummary[];
    accounts(): AccountSummary[];
    /**
     * The account used when a caller names none: `WEREAD_ACCOUNT` first, then the
     * recorded default. A stale value — an alias that no longer has an account —
     * is ignored rather than fatal, so removing an account cannot wedge the CLI.
     */
    defaultAccount(): string | undefined;
    setDefaultAccount(aliasInput: string): AccountSummary;
    clearDefaultAccount(): void;
    select(requested?: readonly string[]): string[];
    login(aliasInput: string, options: AccountLoginOptions): Promise<AccountSummary & ClientIdentity>;
    open(aliasInput: string): Promise<OpenAccount>;
}
