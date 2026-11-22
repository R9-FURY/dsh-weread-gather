import type { AskBookInput, AskBookResult, MobileTransport, SuggestInput, SuggestResponse } from "../types.js";
/**
 * The between-polls delay. It takes the signal because a loop that only checks cancellation
 * between requests still makes an abandoned caller wait out a full delay first.
 */
type Sleep = (milliseconds: number, signal?: AbortSignal) => Promise<void>;
export declare function aiModule(mobile: MobileTransport, sleep?: Sleep): {
    askBook(input: AskBookInput): Promise<AskBookResult>;
    suggest(input: SuggestInput): Promise<SuggestResponse>;
};
export {};
