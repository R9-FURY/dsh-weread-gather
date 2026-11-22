import { type Command } from "commander";
import type { CanonicalClient } from "../api/client.js";
import type { MobileApiClient } from "../api/mobile-client.js";
import { PUBLIC_OPERATIONS } from "../api/operations.js";
import type { PublicAccountLibrary, PublicAccountLibraryMode } from "../api/types.js";
import { type OutputWriter } from "./output.js";
export interface CommandContext<TClient extends CliOperationsClient = MobileApiClient> {
    getClient: () => TClient;
    stdout: OutputWriter;
    confirm: (message: string) => Promise<boolean>;
    isTTY: boolean;
    signal?: AbortSignal;
}
type CliResource = keyof typeof PUBLIC_OPERATIONS;
type CliMethod<Resource extends CliResource> = Extract<(typeof PUBLIC_OPERATIONS)[Resource][number], keyof CanonicalClient[Resource]>;
export type CliOperation = {
    [Resource in CliResource]: `${Resource & string}.${CliMethod<Resource> & string}`;
}[CliResource];
/** Canonical operations a programmatic CLI store may implement. */
export type CliOperationsClient = {
    readonly [Resource in CliResource]?: {
        readonly [Method in CliMethod<Resource>]?: CanonicalClient[Resource][Method];
    };
};
type ClientForOne<Operation extends CliOperation> = Operation extends `${infer Resource}.${infer Method}` ? Resource extends CliResource ? Method extends CliMethod<Resource> ? {
    readonly [Key in Resource]: {
        readonly [Action in Method]: CanonicalClient[Resource][Action];
    };
} : never : never : never;
type UnionToIntersection<Value> = (Value extends unknown ? (argument: Value) => void : never) extends (argument: infer Intersection) => void ? Intersection : never;
export type CliClientFor<Operation extends CliOperation> = UnionToIntersection<ClientForOne<Operation>>;
export declare const CLI_OPERATIONS: readonly CliOperation[];
interface BuiltinCommandContext {
    getClientFor<const Operations extends readonly [CliOperation, ...CliOperation[]]>(...operations: Operations): CliClientFor<Operations[number]>;
    /** Artifact helpers need both public-account pages and review detail. */
    getFullClientFor?: (...operations: CliOperation[]) => Pick<CanonicalClient, "publicAccounts" | "review">;
    /**
     * The content library, when one is open.
     *
     * Threaded explicitly rather than reached through the client: article bodies come from
     * mp.weixin.qq.com through module-private helpers, so the client decorator cannot see them.
     */
    library?: PublicAccountLibrary;
    /** Whether stored articles are read. `--refresh` still writes; it only declines to read. */
    libraryMode?: PublicAccountLibraryMode;
    stdout: OutputWriter;
    confirm: (message: string) => Promise<boolean>;
    isTTY: boolean;
    signal?: AbortSignal;
}
/** Remove canonical leaves that no configured store and active gate can execute. */
export declare function retainCliOperations(program: Command, operations: ReadonlySet<CliOperation>): void;
export declare function integer(value: string): number;
export declare function port(value: string): number;
/** @internal Shared so lifecycle commands print exactly like operation commands do. */
export declare const human: (value: unknown) => string;
export declare function registerReadCommands(program: Command, context: BuiltinCommandContext): void;
export declare function registerWriteCommands(program: Command, context: BuiltinCommandContext): void;
export {};
