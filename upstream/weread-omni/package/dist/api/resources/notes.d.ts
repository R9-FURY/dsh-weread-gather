import type { AddBookmarkInput, BestBookmarksResponse, BestNotesOptions, BookmarkListResponse, MineNotesOptions, MineReviewListResponse, MobileTransport, MutationSuccessResponse, NotebooksOptions, NotebooksResponse, ReadReviewQuery, ReadReviewsResponse, RecentNotesOptions, RecentNotesResponse, RequestOptions, SyncOptions, UnderlinesResponse, UpdateBookmarkInput } from "../types.js";
export declare function notesModule(mobile: MobileTransport): {
    notebooks(options?: NotebooksOptions): Promise<NotebooksResponse>;
    recent(options?: RecentNotesOptions): Promise<RecentNotesResponse>;
    bookmarks(bookId: string, options?: SyncOptions): Promise<BookmarkListResponse>;
    mine(bookId: string, options?: MineNotesOptions): Promise<MineReviewListResponse>;
    best(bookId: string, options?: BestNotesOptions): Promise<BestBookmarksResponse>;
    readReviews(bookId: string, chapterUid: number, reviews: ReadReviewQuery[], options?: RequestOptions): Promise<ReadReviewsResponse>;
    underlines(bookId: string, chapterUid: number, options?: SyncOptions): Promise<UnderlinesResponse>;
    addBookmark(input: AddBookmarkInput): Promise<MutationSuccessResponse>;
    updateBookmark(input: UpdateBookmarkInput): Promise<MutationSuccessResponse>;
    removeBookmark(bookmarkId: string, options?: RequestOptions): Promise<MutationSuccessResponse>;
};
