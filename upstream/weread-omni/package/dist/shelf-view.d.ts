/**
 * A shelf listing a caller can actually read.
 *
 * `/shelf/sync` answers with the app's own sync payload: 48 fields per book, most of them store and
 * DRM plumbing (`maxFreeInfo`, `otherType`, `payType`, `blockSaveImg`, …), plus a parallel
 * `bookProgress` array keyed only by id. Large shelves serialize to hundreds of kilobytes, and
 * because `bookProgress` is emitted before `books`, whatever truncates such a response first keeps
 * the one block with no titles in it — a listing with nothing to list.
 *
 * So the tool projects. Two things beyond dropping fields:
 *
 * * progress is JOINED onto its book rather than left as a separate id-keyed array, which is what
 *   made it useless on its own;
 * * the result is PAGED, because projection alone does not scale on a tool whose whole job is
 *   listing.
 *
 * The full payload stays available on the SDK and through CLI `shelf sync --full`; agent-facing
 * CLI listings use this projection by default.
 */
/** The page size and its ceiling are declared with the rest of `shelf.sync`'s projected parameters
 * in the operation spec, so the advertised schema and the code that enforces them cannot drift.
 * Re-exported here because this module is where callers already look for them. */
import { DEFAULT_SHELF_COUNT, MAX_SHELF_COUNT } from "./api/operation-spec.js";
export { DEFAULT_SHELF_COUNT, MAX_SHELF_COUNT };
export interface ShelfBookView {
    bookId: string;
    title?: string;
    author?: string;
    translator?: string;
    category?: string;
    format?: string;
    finished?: boolean;
    deepLink?: string;
    secret?: boolean;
    isTop?: boolean;
    /** Percent read, when the account has opened the book. */
    progress?: number;
    /** Seconds spent reading, when the account has opened the book. */
    readingTime?: number;
}
export interface ShelfAlbumView {
    albumId: string;
    name?: string;
    authorName?: string;
    trackCount?: number;
    finishStatus?: string;
    secret?: boolean;
    isTop?: boolean;
}
export interface ShelfView {
    /** Electronic/imported books only, matching the upstream `bookCount`. */
    bookCount: number;
    albumCount: number;
    /** books + albums + the article-collection entry when present. */
    totalCount: number;
    publicCount: number;
    privateCount: number;
    /** Number of shelf entries in this page. */
    returnedCount: number;
    offset: number;
    /** Absent when the last shelf entry has been returned — its presence is the "call again" signal. */
    nextOffset?: number;
    books: ShelfBookView[];
    albums: ShelfAlbumView[];
    /** The article-collection directory is one private visible shelf entry. */
    mp?: true;
    note: string;
}
/**
 * Narrow a raw `/shelf/sync` body to the fields a listing needs, joining reading progress onto each
 * book and returning one page.
 */
export declare function shelfView(raw: unknown, options?: {
    count?: unknown;
    offset?: unknown;
}): ShelfView;
