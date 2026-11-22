export interface RequestSignal {
    signal: AbortSignal;
    dispose: () => void;
}
/** Combine a caller signal with a per-request timeout. */
export declare const requestSignal: (signal: AbortSignal | undefined, timeoutMs: number) => RequestSignal;
/**
 * A delay that ends the moment the caller aborts, instead of running to completion.
 *
 * A polling loop that only tests the signal *between* requests still leaves the caller waiting
 * out a full delay after it has disconnected — with the AI poll's 1.5s cap and 80 polls, up to
 * two minutes of it. The timer is cleared on abort so an abandoned poll does not hold the event
 * loop open either.
 */
export declare const abortableDelay: (milliseconds: number, label: string, signal?: AbortSignal) => Promise<void>;
/**
 * Await `promise`, but stop waiting when `signal` aborts.
 *
 * Deliberately does NOT cancel the work: it is used where one operation is shared by several
 * callers (the single-flight token mint), and one caller giving up must not take the others'
 * result with it.
 */
export declare const waitUnlessAborted: <Value>(promise: Promise<Value>, label: string, signal?: AbortSignal) => Promise<Value>;
