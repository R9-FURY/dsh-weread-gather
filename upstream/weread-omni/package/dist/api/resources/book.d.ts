import type { BookDetailOptions, BookDetailResponse, BookInfo, BookProgress, ChapterInfoResponse, MobileTransport, RequestOptions } from "../types.js";
/** Public book reads: metadata, detail panels, table of contents, and progress. */
export declare function bookModule(mobile: MobileTransport): {
    info: (bookId: string, options?: RequestOptions) => Promise<BookInfo>;
    detail: (bookId: string, options?: BookDetailOptions) => Promise<BookDetailResponse>;
    chapters: (bookId: string, options?: RequestOptions) => Promise<ChapterInfoResponse>;
    progress: (bookId: string, options?: RequestOptions) => Promise<BookProgress>;
};
