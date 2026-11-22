import type { CanonicalClient } from "../api/client.js";
import { type Logger } from "../logger.js";
import type { ContentLibrary } from "./store.js";
export type LibraryMode = "prefer" | "refresh" | "off";
export interface LibraryClientOptions {
    library: ContentLibrary;
    /**
     * `prefer` serves stored content, `refresh` refetches and replaces it, `off` disables both
     * reading and writing.
     */
    mode?: LibraryMode;
    logger?: Logger;
}
/**
 * Wrap a canonical client so reads consult the local library first.
 *
 * A canonical client is a flat record of bound method references, so re-spreading it preserves
 * every unwrapped operation, including any method a client attaches beyond the canonical contract.
 * Only the read paths that produce storable content are replaced, and no existing call site
 * changes.
 *
 * Chapter text is one of those paths but is not a canonical operation, so the client may not serve
 * it at all. The wrapper is installed only when the client exposes it; otherwise the operation
 * stays absent and reports itself as unsupported rather than failing inside this decorator.
 *
 * Article bodies are out of reach: they come from mp.weixin.qq.com through helpers that are private
 * to `public-accounts.ts`. Those paths take the library directly.
 */
export declare function withContentLibrary(client: CanonicalClient, options: LibraryClientOptions): CanonicalClient;
