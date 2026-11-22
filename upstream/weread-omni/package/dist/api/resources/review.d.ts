import type { MobileTransport, MutationSuccessResponse, RequestOptions, ReviewAddInput, ReviewAddResponse, ReviewEditResponse, ReviewListOptions, ReviewListResponse, ReviewSingleOptions, ReviewSingleResponse } from "../types.js";
export declare function reviewModule(mobile: MobileTransport): {
    list(bookId: string, options?: ReviewListOptions): Promise<ReviewListResponse>;
    single(reviewId: string, options?: ReviewSingleOptions): Promise<ReviewSingleResponse>;
    add(input: ReviewAddInput): Promise<ReviewAddResponse>;
    edit(reviewId: string, content: string, options?: RequestOptions): Promise<ReviewEditResponse>;
    delete: (reviewId: string, options?: RequestOptions) => Promise<MutationSuccessResponse>;
};
