import type { CosUploader, MobileTransport } from "../types.js";
export interface MobileResourceDependencies {
    /** Receives the caller's signal so an abandoned AI poll does not wait its delay out. */
    sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
    cosUpload?: CosUploader;
    env?: NodeJS.ProcessEnv;
}
export declare function createMobileResources(mobile: MobileTransport, dependencies?: MobileResourceDependencies): {
    search: {
        books(keyword: string, options?: import("../types.js").SearchOptions): Promise<import("../types.js").SearchResponse>;
        suggest(keyword: string, options?: import("../types.js").SearchSuggestOptions): Promise<import("../types.js").SearchSuggestResponse>;
    };
    book: {
        info: (bookId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").BookInfo>;
        detail: (bookId: string, options?: import("../types.js").BookDetailOptions) => Promise<import("../types.js").BookDetailResponse>;
        chapters: (bookId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").ChapterInfoResponse>;
        progress: (bookId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").BookProgress>;
    };
    shelf: {
        sync: (options?: import("../types.js").RequestOptions) => Promise<import("../types.js").ShelfSyncResponse>;
        add: (bookId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MutationSuccessResponse>;
        delete: (bookId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MutationSuccessResponse>;
        pin: (bookId: string, top?: boolean, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MutationSuccessResponse>;
        setPrivate: (bookId: string, on?: boolean, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MutationSuccessResponse>;
        markFinished: (bookId: string, on?: boolean, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MarkFinishedResponse>;
        markReading: (bookId: string, on?: boolean, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MarkFinishedResponse>;
    };
    publicAccounts: {
        subscriptions(options?: import("../types.js").PublicAccountSubscriptionsOptions): Promise<import("../types.js").PublicAccountSubscriptionsPage>;
        articles(accountId: string, options?: import("../types.js").PublicAccountArticlesOptions): Promise<import("../types.js").PublicAccountArticlesPage>;
        resolveArticle(docUrl: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").PublicAccountArticleResolution>;
        paidContent(docUrl: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").PaidArticleResponse>;
        subscribe(accountId: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").MutationSuccessResponse>;
        unsubscribe(accountId: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").MutationSuccessResponse>;
    };
    notes: {
        notebooks(options?: import("../types.js").NotebooksOptions): Promise<import("../types.js").NotebooksResponse>;
        recent(options?: import("../types.js").RecentNotesOptions): Promise<import("../types.js").RecentNotesResponse>;
        bookmarks(bookId: string, options?: import("../types.js").SyncOptions): Promise<import("../types.js").BookmarkListResponse>;
        mine(bookId: string, options?: import("../types.js").MineNotesOptions): Promise<import("../types.js").MineReviewListResponse>;
        best(bookId: string, options?: import("../types.js").BestNotesOptions): Promise<import("../types.js").BestBookmarksResponse>;
        readReviews(bookId: string, chapterUid: number, reviews: import("../types.js").ReadReviewQuery[], options?: import("../types.js").RequestOptions): Promise<import("../types.js").ReadReviewsResponse>;
        underlines(bookId: string, chapterUid: number, options?: import("../types.js").SyncOptions): Promise<import("../types.js").UnderlinesResponse>;
        addBookmark(input: import("../types.js").AddBookmarkInput): Promise<import("../types.js").MutationSuccessResponse>;
        updateBookmark(input: import("../types.js").UpdateBookmarkInput): Promise<import("../types.js").MutationSuccessResponse>;
        removeBookmark(bookmarkId: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").MutationSuccessResponse>;
    };
    review: {
        list(bookId: string, options?: import("../types.js").ReviewListOptions): Promise<import("../types.js").ReviewListResponse>;
        single(reviewId: string, options?: import("../types.js").ReviewSingleOptions): Promise<import("../types.js").ReviewSingleResponse>;
        add(input: import("../types.js").ReviewAddInput): Promise<import("../types.js").ReviewAddResponse>;
        edit(reviewId: string, content: string, options?: import("../types.js").RequestOptions): Promise<import("../types.js").ReviewEditResponse>;
        delete: (reviewId: string, options?: import("../types.js").RequestOptions) => Promise<import("../types.js").MutationSuccessResponse>;
    };
    readData: {
        detail(options?: import("../types.js").ReadDataOptions): Promise<import("../types.js").ReadDataResponse>;
    };
    discover: {
        recommend(options?: import("../types.js").RecommendOptions): Promise<import("../types.js").RecommendResponse>;
        similar(bookId: string, options?: import("../types.js").SimilarOptions): Promise<import("../types.js").SimilarResponse>;
    };
    ai: {
        askBook(input: import("../types.js").AskBookInput): Promise<import("../types.js").AskBookResult>;
        suggest(input: import("../types.js").SuggestInput): Promise<import("../types.js").SuggestResponse>;
    };
    import: {
        book(input: import("../types.js").ImportBookInput): Promise<import("../types.js").ImportBookResult>;
    };
};
