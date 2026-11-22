import { type OperationGate } from "./api/operation-spec.js";
/** The single switch that closes every write. */
export declare const READONLY_ENVIRONMENT_VARIABLE = "WEREAD_READONLY";
/** Canonical operation identifier to its optional write gate. */
export declare const OPERATION_GATES: Readonly<Record<string, OperationGate | undefined>>;
export declare const operationGate: (operation: string) => OperationGate | undefined;
export declare const gateDisabledMessage: (gate: OperationGate) => string;
/**
 * Every write is permitted by default; one variable closes them all, which is how an operator locks
 * a deployment down. Unset, empty, and whitespace all mean "default", so a blank line in a `.env`
 * cannot change policy. Otherwise `1`/`true`/`yes` closes writes and anything else leaves them open.
 *
 * The gate taxonomy survives because it still says which operations are writes -- it just no longer
 * selects between variables. Reads have no gate and are never affected.
 */
export declare const gateEnabled: (gate: OperationGate | undefined, env: NodeJS.ProcessEnv) => boolean;
/** True for known reads; for known writes, true unless the read-only switch is set. */
export declare const operationEnabled: (operation: string, env: NodeJS.ProcessEnv) => boolean;
