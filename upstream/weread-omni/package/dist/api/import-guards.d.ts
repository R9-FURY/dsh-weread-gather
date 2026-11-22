import { WeReadError } from "../errors.js";
/**
 * A copy, not the validator's own set: this is public API, and handing out the live Set let a
 * consumer call .add() and widen upload validation process-wide.
 */
export declare const ALLOWED_EXT: ReadonlySet<string>;
export declare class BookValidationError extends WeReadError {
    readonly code: "unsupported-format" | "too-large";
    constructor(code: "unsupported-format" | "too-large", message: string);
}
export declare function maxUploadBytes(env?: NodeJS.ProcessEnv): number;
export declare function assertBook(name: string, size: number, env?: NodeJS.ProcessEnv): void;
export declare function readBookFile(name: string, filePath: string, env?: NodeJS.ProcessEnv): Promise<Buffer>;
