import type { BookInfo, ChapterContent, ChapterInfoResponse, PutArticleInput, StoredArticle } from "../api/types.js";
import { type Logger } from "../logger.js";
/**
 * Does this look like a paywall preview rather than a chapter?
 *
 * A locked chapter comes back as HTTP 200 in the same shape a real one uses: a short plain-text
 * excerpt, the opening paragraphs followed by an ellipsis. Nothing downstream distinguishes it, so
 * without this the library stores the excerpt as the chapter body -- permanently, since content is
 * never re-fetched once stored, and `verify` reports it clean because the bytes match their digest.
 *
 * The test is structural rather than length-based. An `epub` chapter body is an XHTML document and
 * a preview carries no markup at all; measured across one book's 41 chapters every real body
 * contains a tag and every preview contains none. Length would misfire in both directions -- a
 * copyright page is legitimately ~120 characters, the same size as a preview. `txt` chapters are
 * exempt because plain text is their correct shape, and there is no known preview in that format.
 */
export declare function isPaywallPreview(content: ChapterContent): boolean;
/** Which backend produced a chapter listing. Synckey spaces differ, so they never compare. */
export type TocBackend = "official" | "eink";
export interface ContentLibraryOptions {
    /** WeRead account identity. Content is entitlement-scoped, so rows are per account. */
    vid: string;
    env?: NodeJS.ProcessEnv;
    /** Overrides the environment-resolved root. */
    root?: string;
    logger?: Logger;
}
export interface ChapterMetadata {
    origin?: string;
    tocSynckey?: number;
    chapterIdx?: number;
    title?: string;
}
export interface LibraryStats {
    chapters: number;
    /** Stored chapter listings. Counted separately: a book can have an index but no bodies yet. */
    chapterIndexes: number;
    /**
     * Payloads retained because a refresh displaced them.
     *
     * Reported because nothing reclaims them. Retention is deliberate -- a refetch that returns a
     * challenge page must not erase good content -- but growth that cannot be measured is
     * indistinguishable from a leak.
     */
    supersededVersions: number;
    books: number;
    articles: number;
    blobs: number;
    blobBytes: number;
}
/**
 * Local store of downloaded content.
 *
 * Records and indexes live in SQLite; payload bytes live in the content-addressed blob store. The
 * split is deliberate: identity lookups want an index, and payloads want to be streamable and
 * deduplicated.
 *
 * Read failures degrade to a miss rather than an error, because the caller's remedy is to fetch
 * again. Write failures are surfaced, because silently not storing defeats the entire point.
 */
export declare class ContentLibrary {
    #private;
    readonly root: string;
    private constructor();
    static open(options: ContentLibraryOptions): Promise<ContentLibrary>;
    close(): void;
    /**
     * Whether a chapter is stored *and* its payload is present.
     *
     * The blob check is not redundant. Rows live in the database and bytes live on disk, so a
     * restored backup, an unmounted volume or a partial copy can leave one without the other. If
     * `has` answered from the row alone it would report content that `get` cannot produce, and a
     * caller that trusts it would emit nothing at all rather than fetching.
     */
    has(bookId: string, chapterUid: number): boolean;
    /**
     * Which of `chapterUids` are absent.
     *
     * Optimistic by contract: a later `getChapterContent` miss means fetch, never means the content
     * does not exist. One indexed scan rather than a query per chapter, and no bound-parameter list,
     * which would cap out well before a long serial does.
     */
    missing(bookId: string, chapterUids: readonly number[]): number[];
    getChapterContent(bookId: string, chapterUid: number): Promise<ChapterContent | undefined>;
    /**
     * Store one chapter.
     *
     * Blob files are written and made durable first, then a single transaction inserts the blob rows
     * and the chapter row together. A crash between the two leaves an unreferenced file, which costs
     * disk; the reverse order would leave a row pointing at bytes that do not exist, which costs
     * correctness.
     *
     * A paywall preview is refused before any blob is written, so a refusal leaks nothing.
     */
    putChapterContent(content: ChapterContent, meta?: ChapterMetadata): Promise<void>;
    getBookInfo(bookId: string): BookInfo | undefined;
    /**
     * Store book metadata, rejecting the empty response an unguarded upstream cast can produce.
     *
     * `origin` is write-only provenance: nothing reads the column back, it exists so a damaged row can
     * be traced to whatever fetched it. It defaults to this package's only backend; an extension
     * client that fetched the content somewhere else passes its own.
     */
    putBookInfo(bookId: string, info: BookInfo, origin?: string): void;
    getChapterIndex(bookId: string, backend: TocBackend): ChapterInfoResponse | undefined;
    /**
     * Store a chapter listing, keeping whichever synckey is higher.
     *
     * A single statement rather than read-compare-write: the comparison happens inside SQLite, so a
     * concurrent writer cannot land between the read and the write.
     *
     * A listing with no chapters, or with synckey zero, is refused. Upstream returns both as
     * well-formed responses when it is degraded, and storing one would serve an empty book forever.
     */
    putChapterIndex(response: ChapterInfoResponse, backend: TocBackend): void;
    /**
     * Read one stored article, or undefined if it is absent or unusable.
     *
     * Every payload the caller might need is loaded here rather than lazily, because the two
     * consumers -- the feed and the archive export -- each need a different subset, and a lazy
     * accessor would make a partially damaged article look complete until whichever field they
     * happened to touch came back empty.
     */
    getArticle(reviewId: string): Promise<StoredArticle | undefined>;
    /**
     * Store one article and everything needed to reproduce it.
     *
     * An article with no payload at all is declined rather than stored: it would report as present
     * and then produce nothing, which is worse than a miss.
     */
    putArticle(input: PutArticleInput): Promise<void>;
    stats(): LibraryStats;
    verify(): Promise<{
        ok: boolean;
        problems: string[];
    }>;
}
