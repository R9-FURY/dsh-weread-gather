import type { MobileTransport, MutationSuccessResponse, PaidArticleResponse, PublicAccountArticleResolution, PublicAccountArticlesOptions, PublicAccountArticlesPage, PublicAccountSubscriptionsOptions, PublicAccountSubscriptionsPage, RequestOptions } from "../types.js";
export declare function publicAccountsModule(mobile: MobileTransport): {
    subscriptions(options?: PublicAccountSubscriptionsOptions): Promise<PublicAccountSubscriptionsPage>;
    articles(accountId: string, options?: PublicAccountArticlesOptions): Promise<PublicAccountArticlesPage>;
    resolveArticle(docUrl: string, options?: RequestOptions): Promise<PublicAccountArticleResolution>;
    /**
     * Fetch a paid article body.
     *
     * The entitlement check happens server-side: an entitled account gets the authorized HTML
     * back, and an unentitled one gets `ispaid: false` plus a substitute URL pointing at the
     * preview. There is no archive, no encryption key and no client-side decryption here -- that
     * pipeline belongs to paid ebook chapters, not to public-account articles.
     *
     * Measured against a live session, this route answers `-2012` ("登录超时") for a session that
     * every other mobile route serves normally -- `/book/chapterInfos` returns 200 with the same
     * headers in the same process. The body shape below is right: sending `url` instead of `urls`
     * gets `-2003` from parameter validation, so `{urls, need_content}` is what reaches the
     * entitlement check. What the route wants beyond a valid access token is not established, and
     * a `-2012` from here should not be read as an expired token.
     */
    paidContent(docUrl: string, options?: RequestOptions): Promise<PaidArticleResponse>;
    subscribe(accountId: string, options?: RequestOptions): Promise<MutationSuccessResponse>;
    unsubscribe(accountId: string, options?: RequestOptions): Promise<MutationSuccessResponse>;
};
