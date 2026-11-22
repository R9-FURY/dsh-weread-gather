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
const text = (value) => {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
const numeric = (value) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
/** WeRead uses 0/1 ints for booleans here. */
const bool = (value) => {
    if (typeof value === "boolean")
        return value;
    if (value === 1)
        return true;
    if (value === 0)
        return false;
    return undefined;
};
const positiveInt = (value, fallback) => {
    const parsed = numeric(value);
    return parsed !== undefined && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
};
/**
 * Narrow a raw `/shelf/sync` body to the fields a listing needs, joining reading progress onto each
 * book and returning one page.
 */
export function shelfView(raw, options = {}) {
    const body = (raw ?? {});
    const books = Array.isArray(body.books) ? body.books : [];
    const rawAlbums = Array.isArray(body.albums) ? body.albums : [];
    const hasMp = body.mp !== null && typeof body.mp === "object" && !Array.isArray(body.mp) && Object.keys(body.mp).length > 0;
    const albums = rawAlbums.map(({ albumInfo = {}, albumInfoExtra = {} }) => ({
        albumId: text(albumInfo.albumId) ?? "",
        ...(text(albumInfo.name) ? { name: text(albumInfo.name) } : {}),
        ...(text(albumInfo.authorName) ? { authorName: text(albumInfo.authorName) } : {}),
        ...(numeric(albumInfo.trackCount) !== undefined ? { trackCount: numeric(albumInfo.trackCount) } : {}),
        ...(text(albumInfo.finishStatus) ? { finishStatus: text(albumInfo.finishStatus) } : {}),
        ...(bool(albumInfoExtra.secret) !== undefined ? { secret: bool(albumInfoExtra.secret) } : {}),
        ...(bool(albumInfoExtra.isTop) !== undefined ? { isTop: bool(albumInfoExtra.isTop) } : {}),
    }));
    const publicCount = books.filter((book) => bool(book.secret) === false).length +
        rawAlbums.filter((album) => bool(album.albumInfoExtra?.secret) === false).length;
    const privateCount = books.filter((book) => bool(book.secret) === true).length +
        rawAlbums.filter((album) => bool(album.albumInfoExtra?.secret) === true).length +
        (hasMp ? 1 : 0);
    const totalCount = books.length + albums.length + (hasMp ? 1 : 0);
    const progressById = new Map();
    if (Array.isArray(body.bookProgress)) {
        for (const entry of body.bookProgress) {
            const id = text(entry?.bookId);
            if (id)
                progressById.set(id, entry);
        }
    }
    const project = (book) => {
        const bookId = text(book.bookId) ?? "";
        const progress = progressById.get(bookId);
        const finished = bool(book.finishReading) ?? bool(book.finished);
        // Omit rather than emit nulls: on a large shelf an absent-but-present key costs more than it says.
        return {
            bookId,
            ...(text(book.title) ? { title: text(book.title) } : {}),
            ...(text(book.author) ? { author: text(book.author) } : {}),
            ...(text(book.translator) ? { translator: text(book.translator) } : {}),
            ...(text(book.category) ? { category: text(book.category) } : {}),
            ...(text(book.format) ? { format: text(book.format) } : {}),
            ...(finished !== undefined ? { finished } : {}),
            ...(text(book.deepLink) ? { deepLink: text(book.deepLink) } : {}),
            ...(bool(book.secret) !== undefined ? { secret: bool(book.secret) } : {}),
            ...(bool(book.isTop) !== undefined ? { isTop: bool(book.isTop) } : {}),
            ...(numeric(progress?.progress) !== undefined ? { progress: numeric(progress?.progress) } : {}),
            ...(numeric(progress?.readingTime) !== undefined
                ? { readingTime: numeric(progress?.readingTime) }
                : {}),
        };
    };
    const allEntries = [
        ...books.map((book) => ({ kind: "book", value: project(book) })),
        ...albums.map((album) => ({ kind: "album", value: album })),
        ...(hasMp ? [{ kind: "mp" }] : []),
    ];
    const requested = positiveInt(options.count, DEFAULT_SHELF_COUNT);
    const count = Math.min(Math.max(requested, 1), MAX_SHELF_COUNT);
    const offset = Math.min(positiveInt(options.offset, 0), allEntries.length);
    const page = allEntries.slice(offset, offset + count);
    const render = (entries) => {
        const end = offset + entries.length;
        const more = end < allEntries.length;
        const pageBooks = entries.flatMap((entry) => (entry.kind === "book" ? [entry.value] : []));
        const pageAlbums = entries.flatMap((entry) => (entry.kind === "album" ? [entry.value] : []));
        const pageHasMp = entries.some((entry) => entry.kind === "mp");
        return {
            bookCount: numeric(body.bookCount) ?? books.length,
            albumCount: albums.length,
            totalCount,
            publicCount,
            privateCount,
            returnedCount: entries.length,
            offset,
            ...(more ? { nextOffset: end } : {}),
            books: pageBooks,
            albums: pageAlbums,
            ...(pageHasMp ? { mp: true } : {}),
            note: entries.length === 0
                ? `Showing 0 of ${totalCount} shelf entries.`
                : more
                    ? `Showing ${offset + 1}-${end} of ${totalCount} shelf entries. Call again with offset=${end} for the rest.`
                    : `Showing ${offset + 1}-${end} of ${totalCount} shelf entries.`,
        };
    };
    return render(page);
}
//# sourceMappingURL=shelf-view.js.map