import type { MobileTransport, SearchOptions, SearchResponse, SearchSuggestOptions, SearchSuggestResponse } from "../types.js";
export declare function searchModule(mobile: MobileTransport): {
    books(keyword: string, options?: SearchOptions): Promise<SearchResponse>;
    suggest(keyword: string, options?: SearchSuggestOptions): Promise<SearchSuggestResponse>;
};
