import { WeReadError } from "../../errors.js";
import type { CosUploader, ImportBookInput, ImportBookResult, MobileTransport } from "../types.js";
export type ImportFailurePhase = "pre-notify" | "post-notify";
export declare class ImportPhaseError extends WeReadError {
    readonly phase: ImportFailurePhase;
    readonly ambiguous: boolean;
    readonly digest?: string;
    constructor(message: string, info: {
        phase: ImportFailurePhase;
        ambiguous: boolean;
        digest?: string;
        cause?: unknown;
    });
}
export declare const isAmbiguousImportOutcome: (error: unknown) => error is ImportPhaseError;
export declare function importModule(mobile: MobileTransport, upload?: CosUploader, env?: NodeJS.ProcessEnv): {
    book(input: ImportBookInput): Promise<ImportBookResult>;
};
