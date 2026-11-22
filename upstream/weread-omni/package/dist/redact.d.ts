/**
 * Redaction of secret-bearing text.
 *
 * A single-pass scanner rather than a stack of regexes. A ~400,000-input randomized audit showed
 * the regex cascade could not converge: recovering a value's boundary needs quote and escape state
 * that a lexical pattern does not carry, and every widening that reached one leak corrupted
 * ordinary content elsewhere ("Basic Econometrics", "const password = prompt()"). This tracks the
 * state instead of guessing at it.
 *
 * Understood: both quote styles with backslash escapes, one level of JSON-in-a-string escaping
 * (a secret nested inside an escaped JSON payload), truncated values, keys written in encoded form
 * (\u0077, %77), and the delimiter the surrounding syntax implies — & in a query, ; in a cookie,
 * , } ] inside JSON, and end of line for a .env or YAML entry that owns its line.
 *
 * Still an allowlist of key names, so this remains defence in depth rather than a guarantee. Two
 * limits are known and accepted, both because the alternative is worse:
 *   - `const password = prompt();` in source text is redacted; those bytes are indistinguishable
 *     from a config line leaking one.
 *   - a bare `Basic YWFhYTphYWFh` in free text is not, because a short all-letter credential is
 *     indistinguishable from a title like "Basic Econometrics". Inside an explicit
 *     `Authorization:` header it IS redacted, whatever it looks like.
 */
export declare function redact(message: string): string;
export declare const stripErrorPrefix: (message: string) => string;
