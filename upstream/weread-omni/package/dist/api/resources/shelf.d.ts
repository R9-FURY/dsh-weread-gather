import type { MarkFinishedResponse, MobileTransport, MutationSuccessResponse, RequestOptions, ShelfSyncResponse } from "../types.js";
export declare function shelfModule(mobile: MobileTransport): {
    sync: (options?: RequestOptions) => Promise<ShelfSyncResponse>;
    add: (bookId: string, options?: RequestOptions) => Promise<MutationSuccessResponse>;
    delete: (bookId: string, options?: RequestOptions) => Promise<MutationSuccessResponse>;
    pin: (bookId: string, top?: boolean, options?: RequestOptions) => Promise<MutationSuccessResponse>;
    setPrivate: (bookId: string, on?: boolean, options?: RequestOptions) => Promise<MutationSuccessResponse>;
    markFinished: (bookId: string, on?: boolean, options?: RequestOptions) => Promise<MarkFinishedResponse>;
    markReading: (bookId: string, on?: boolean, options?: RequestOptions) => Promise<MarkFinishedResponse>;
};
