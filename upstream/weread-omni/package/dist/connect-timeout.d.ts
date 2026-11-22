/**
 * Node's per-address connect budget, raised from its 250 ms default.
 *
 * Node >= 20 dials with Happy Eyeballs (RFC 8305): every address a hostname resolves to gets its own
 * connect attempt, and an attempt that has not completed within `autoSelectFamilyAttemptTimeout` is
 * destroyed so the next address can be tried. `i.weread.qq.com` publishes two AAAA records and one A
 * record, so on an IPv4-only host the two AAAA attempts fail instantly with ENETUNREACH — harmless — and
 * everything rides on the IPv4 attempt. A genuine round trip to Tencent measures ~255 ms from Europe
 * or the Americas, a few milliseconds past the 250 ms deadline, so Node abandons the attempt that was
 * about to succeed, runs out of candidates, and `fetch` rejects with `AggregateError: ETIMEDOUT` — surfaced
 * by this package as a bare `network error`. It presents as intermittent because it is a race the
 * connection wins only when the path is having a good day.
 *
 * 1000 ms is roughly four times that measured connect, which absorbs ordinary jitter and a
 * congested link while staying well inside the per-request timeouts that bound an operation
 * overall (every one of them is >= 30 s, so even three candidates at a full second each is a
 * rounding error against the request budget).
 *
 * Happy Eyeballs and dual-stack failover stay on, and an address that *errors* — ENETUNREACH,
 * ECONNREFUSED, RST — still fails instantly and hands off to the next candidate. The real cost is
 * the case this timeout was invented for: an address that black-holes packets rather than
 * refusing them, where the attempt hangs and only the timeout ends it. On such a host the first
 * candidate now burns 1000 ms instead of 250 ms before the next is tried, once per new socket.
 * That is the trade — a bounded, once-per-connection delay on a misconfigured path, against a
 * reproducible failure on a correctly configured one — and it is why the budget is tunable.
 */
export declare const DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS = 1000;
/**
 * Resolves the per-address connect budget from `env`, in milliseconds, or `undefined` for "leave
 * Node's default alone".
 *
 * `WEREAD_CONNECT_ATTEMPT_TIMEOUT_MS`:
 *
 * - unset, empty, or whitespace-only — {@link DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS}. The fix is on
 *   by default, and a variable that exists but is blank means the same as an absent one. Empty
 *   has to land here rather than with the invalid values below, because a container runtime
 *   forwards every tuning knob as `${NAME:-}` — an unset variable arrives as `""`, and treating
 *   that as "opt out" would silently disable the fix in every default container deployment.
 * - `0` — `undefined`. The documented opt-out: keep Node's own 250 ms.
 * - a positive integer up to {@link MAX_ATTEMPT_TIMEOUT_MS} — that many milliseconds. Node clamps
 *   anything under 10 up to 10, so the smallest budget it will really use is 10 ms.
 * - anything else — `undefined`, i.e. the same as `0`.
 *
 * That last rule is why this parser does not throw the way `storageTimeoutMs` does for
 * `WEREAD_STORAGE_TIMEOUT_MS`. The value is consumed as a process-wide side effect before any
 * argument parsing, so throwing would fail every command — including ones that never open a
 * socket — over a knob whose worst case is the behaviour Node would have had anyway.
 */
export declare function connectAttemptTimeoutMs(env?: NodeJS.ProcessEnv): number | undefined;
/**
 * Applies {@link connectAttemptTimeoutMs} to the process, returning the value it set or
 * `undefined` when it left Node's default in place.
 *
 * This mutates a Node-wide default, so only a process entry point may call it: `src/cli.ts` and
 * the CLI entry point does, guarded by `isMain()`. The SDK deliberately does not — a library must not
 * reconfigure its host application's networking. An SDK consumer that needs the same tolerance
 * either sets it themselves or passes their own `fetchImpl`.
 */
export declare function applyConnectAttemptTimeout(env?: NodeJS.ProcessEnv, setAttemptTimeout?: (milliseconds: number) => void): number | undefined;
