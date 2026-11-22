import { captureClientSession, registerClientSessionProvider } from "../api/mobile-client.js";
import { emitLog } from "../logger.js";
/**
 * Run a library write without letting it fail the command.
 *
 * Storing is an optimisation for the next run. A full disk, a revoked permission or a corrupt
 * database should cost the user a warning and a repeated download, never the result they asked
 * for.
 */
async function bestEffort(logger, label, work) {
    try {
        await work();
    }
    catch (error) {
        emitLog(logger, "warn", `content library could not store ${label}: ${error.message}`);
    }
}
/** Chapter text is not a canonical operation; a client may or may not serve it. */
function chapterContentReader(client) {
    const candidate = client.book.chapterContent;
    return typeof candidate === "function" ? candidate : undefined;
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
export function withContentLibrary(client, options) {
    const { library, logger } = options;
    const mode = options.mode ?? "prefer";
    // One backend serves chapter listings, so the stored label is fixed. The column still
    // distinguishes rows written by older releases, which used a second backend.
    const backend = "eink";
    if (mode === "off")
        return client;
    const readChapter = chapterContentReader(client);
    const wrapped = {
        ...client,
        book: {
            ...client.book,
            ...(readChapter
                ? {
                    chapterContent: async (bookId, chapterUid, requestOptions) => {
                        // Checked before the library, not only before the network. Aborting rejects the
                        // operation everywhere else on the request path, and a stored answer must not be the
                        // one case where a cancelled request quietly succeeds.
                        requestOptions?.signal?.throwIfAborted();
                        if (mode === "prefer") {
                            const stored = await readQuietly(logger, "chapter content", () => library.getChapterContent(bookId, chapterUid));
                            if (stored !== undefined)
                                return stored;
                        }
                        const fetched = await readChapter(bookId, chapterUid, requestOptions);
                        await bestEffort(logger, "chapter content", () => library.putChapterContent(fetched));
                        return fetched;
                    },
                }
                : {}),
            chapters: async (bookId, requestOptions) => {
                requestOptions?.signal?.throwIfAborted();
                if (mode === "prefer") {
                    const stored = await readQuietly(logger, "chapter index", () => library.getChapterIndex(bookId, backend));
                    if (stored !== undefined)
                        return stored;
                }
                const fetched = await client.book.chapters(bookId, requestOptions);
                await bestEffort(logger, "chapter index", () => library.putChapterIndex(fetched, backend));
                return fetched;
            },
            info: async (bookId, requestOptions) => {
                requestOptions?.signal?.throwIfAborted();
                if (mode === "prefer") {
                    const stored = await readQuietly(logger, "book metadata", () => library.getBookInfo(bookId));
                    if (stored !== undefined)
                        return stored;
                }
                const fetched = await client.book.info(bookId, requestOptions);
                await bestEffort(logger, "book metadata", () => library.putBookInfo(bookId, fetched));
                return fetched;
            },
        },
    };
    // The session seam is keyed on object identity, not structure, so the wrapper would otherwise
    // miss it and `import.book` would lose the pinned mobile session it needs. Every future decorator
    // inherits this, which is why it is done here rather than left to callers.
    registerClientSessionProvider(wrapped, () => captureClientSession(client));
    return wrapped;
}
/** A damaged library must not fail a read that the network can still satisfy. */
async function readQuietly(logger, label, work) {
    try {
        return await work();
    }
    catch (error) {
        emitLog(logger, "warn", `content library could not read ${label}: ${error.message}`);
        return undefined;
    }
}
//# sourceMappingURL=cached-client.js.map