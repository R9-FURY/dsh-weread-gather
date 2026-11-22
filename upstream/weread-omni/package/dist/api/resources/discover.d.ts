import type { MobileTransport, RecommendOptions, RecommendResponse, SimilarOptions, SimilarResponse } from "../types.js";
export declare function discoverModule(mobile: MobileTransport): {
    recommend(options?: RecommendOptions): Promise<RecommendResponse>;
    similar(bookId: string, options?: SimilarOptions): Promise<SimilarResponse>;
};
