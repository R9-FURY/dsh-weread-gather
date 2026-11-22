import type { MobileResponse } from "./mobile.js";
/**
 * Assert the array fields of a response body, and hand the body back unchanged.
 *
 * `required` names fields the declared type says are always present. `optional` names fields the
 * declared type marks `?`: absent is a legitimate answer, and so is an explicit `null`, which is
 * normalised away so the runtime value cannot contradict the `X[] | undefined` the caller was
 * given. Anything else present under either name is a shape violation.
 */
export declare function expectArrayFields<T>(response: MobileResponse<T>, path: string, required: readonly string[], optional?: readonly string[]): T;
/**
 * The same required/optional assertions one level down, for a response whose list is wrapped in
 * an envelope object (`/book/detailinfo` answers `{ booksimilar: { books: [...] } }`). The envelope
 * itself has to be an object before its fields mean anything, so that is checked first.
 */
export declare function expectNestedArrayFields<T>(response: MobileResponse<T>, path: string, container: string, required: readonly string[], optional?: readonly string[]): T;
