import { type JsonValue } from "./plugin.js";
export declare const ACCOUNT_ALIAS_PATTERN: RegExp;
export interface AccountDescriptor {
    version: 1;
    client: string;
}
export declare function accountsDirectory(env?: NodeJS.ProcessEnv): string;
/** The alias recorded as the default, or undefined when none is set. */
export declare function loadDefaultAccount(env?: NodeJS.ProcessEnv): string | undefined;
/** Record the default account, or clear it when alias is undefined. */
export declare function saveDefaultAccount(alias: string | undefined, env?: NodeJS.ProcessEnv): void;
export declare function loadAccountDescriptor(alias: string, env?: NodeJS.ProcessEnv): AccountDescriptor;
export declare function tryLoadAccountDescriptor(alias: string, env?: NodeJS.ProcessEnv): AccountDescriptor | undefined;
export declare function saveAccountDescriptor(alias: string, descriptor: AccountDescriptor, env?: NodeJS.ProcessEnv): void;
export declare function loadClientState(alias: string, client: string, env?: NodeJS.ProcessEnv): JsonValue;
export declare function tryLoadClientState(alias: string, client: string, env?: NodeJS.ProcessEnv): JsonValue | undefined;
export declare function saveClientState(alias: string, client: string, state: JsonValue, env?: NodeJS.ProcessEnv): void;
export declare function listAccountAliases(env?: NodeJS.ProcessEnv): string[];
