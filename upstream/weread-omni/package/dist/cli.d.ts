#!/usr/bin/env node
import { Command } from "commander";
import { AccountManager, type AccountSummary } from "./accounts.js";
import { type MobileApiClient } from "./api/mobile-client.js";
import type { PublicAccountLibrary, PublicAccountLibraryMode } from "./api/types.js";
import { type CliOperationsClient, type CommandContext } from "./cli/commands.js";
import { type OutputWriter } from "./cli/output.js";
import { ContentLibrary } from "./library/store.js";
export type { Command } from "commander";
export { printQr } from "./auth/qr-terminal.js";
export type { CliOperationsClient, CommandContext } from "./cli/commands.js";
export { integer, port } from "./cli/commands.js";
export type { OutputOptions, OutputWriter } from "./cli/output.js";
export { output } from "./cli/output.js";
export interface CliIdentity {
    vid: string;
    deviceId: string;
    source: "environment" | "file";
}
export interface CliStoreIdentity {
    vid?: string;
    deviceId?: string;
    source?: CliIdentity["source"];
}
export interface CliStore {
    readonly name: string;
    readonly backend: string;
    readonly clientProfile?: string;
    readonly client: CliOperationsClient;
    readonly readIdentity?: () => CliStoreIdentity | Promise<CliStoreIdentity>;
}
export type ExtendProgram<TClient extends CliOperationsClient = MobileApiClient> = (program: Command, context: CommandContext<TClient>) => void;
export interface CliStoreCommandContext {
    getStore: () => CliStore;
    stdout: OutputWriter;
    stderr: OutputWriter;
    confirm: (message: string) => Promise<boolean>;
    isTTY: boolean;
    env: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    /** The library attached to the selected account, absent for help and when disabled or unavailable. */
    library?: ContentLibrary;
}
export type ExtendStoreProgram = (program: Command, context: CliStoreCommandContext) => void;
export interface CliDependencies<TClient extends CliOperationsClient = MobileApiClient> {
    getClient?: () => TClient;
    stores?: readonly CliStore[];
    stdout?: OutputWriter;
    stderr?: OutputWriter;
    env?: NodeJS.ProcessEnv;
    store?: string;
    renderQr?: (text: string) => Promise<string | undefined>;
    getIdentity?: () => CliIdentity;
    confirm?: (message: string) => Promise<boolean>;
    isTTY?: boolean;
    signal?: AbortSignal;
    extendProgram?: ExtendProgram<TClient>;
    extendStoreProgram?: ExtendStoreProgram;
    /** Account mode is explicit so SDK imports never load environment plugins. */
    accountManager?: AccountManager;
    /**
     * The open content library, when there is one.
     *
     * Passed separately from the client because article bodies are fetched by module-private
     * helpers inside the public-account paths, which a client decorator cannot reach.
     */
    library?: PublicAccountLibrary;
    /** Whether stored articles are read. `--refresh` still writes; it only declines to read. */
    libraryMode?: PublicAccountLibraryMode;
}
export declare function createProgram<TClient extends CliOperationsClient = MobileApiClient>(dependencies?: CliDependencies<TClient>): Command;
export declare function runCli<TClient extends CliOperationsClient = MobileApiClient>(argv?: string[], dependencies?: CliDependencies<TClient>): Promise<number>;
export interface AccountCliDependencies extends Omit<CliDependencies, "accountManager" | "stores" | "getClient"> {
    accountManager: AccountManager;
    /** Choose an account when an interactive command has several candidates and no default. */
    selectAccount?: AccountSelector;
}
export type AccountSelector = (accounts: readonly AccountSummary[]) => Promise<string> | string;
export declare function runAccountCli(argv: string[] | undefined, dependencies: AccountCliDependencies): Promise<number>;
export declare function isMain(moduleUrl?: string, entry?: string | undefined): boolean;
