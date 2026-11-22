import type { CanonicalClient } from "./api/client.js";
import type { PublicAccountArchiveOptions, PublicAccountArchiveResult, PublicAccountArtifactErrorCode, PublicAccountDiagnostic, PublicAccountFeedOptions, PublicAccountFeedResult, PublicAccountFeedSource, PublicAccountLibrary, PublicAccountLibraryMode } from "./api/types.js";
import { WeReadError } from "./errors.js";
type PublicAccountClient = Pick<CanonicalClient, "publicAccounts" | "review">;
type ArticleClient = {
    publicAccounts: Pick<CanonicalClient["publicAccounts"], "paidContent">;
    review: Pick<CanonicalClient["review"], "single">;
};
type SingleArticleClient = ArticleClient & {
    publicAccounts: Pick<CanonicalClient["publicAccounts"], "resolveArticle">;
};
export interface PublicAccountReadOptions {
    signal?: AbortSignal;
    library?: PublicAccountLibrary;
    libraryMode?: PublicAccountLibraryMode;
}
export interface PublicAccountReadResult {
    reviewId: string;
    title: string | null;
    accountName: string | null;
    sourceUrl: string;
    publishedAt: string | null;
    readAt: string;
    fetchedAt: string | null;
    cachedAt: string | null;
    fromCache: boolean;
    status: "readable" | "partial" | "unavailable";
    /** Readable HTML is not proof that the publisher's entire article was returned. */
    completeness: "unverified" | "partial" | "unavailable";
    markdown: string | null;
    contentHtml: string | null;
    sourceSha256: string | null;
    diagnostics: PublicAccountDiagnostic[];
}
export declare class PublicAccountReadError extends WeReadError {
    readonly result: PublicAccountReadResult;
    constructor(result: PublicAccountReadResult);
}
export declare class PublicAccountArtifactError extends WeReadError {
    readonly code: PublicAccountArtifactErrorCode;
    readonly path: string;
    readonly incomplete: boolean;
    readonly incompletePath?: string;
    readonly authenticationHint?: string;
    readonly status?: number;
    readonly upstreamPath?: string;
    readonly errCode?: number;
    readonly ambiguous: boolean;
    constructor(message: string, info: {
        code: PublicAccountArtifactErrorCode;
        path: string;
        incomplete?: boolean;
        cause?: unknown;
    });
}
/** Read one URL through the same source, entitlement and library pipeline as feed/export. */
export declare function readPublicAccountArticle(client: SingleArticleClient, docUrl: string, options?: PublicAccountReadOptions): Promise<PublicAccountReadResult>;
export declare function buildPublicAccountFeed(client: PublicAccountClient, source: PublicAccountFeedSource, options: PublicAccountFeedOptions): Promise<PublicAccountFeedResult>;
export declare function publishPublicAccountFeed(path: string, content: string): Promise<void>;
export declare function exportPublicAccountArchive(client: PublicAccountClient, accountId: string, options: PublicAccountArchiveOptions): Promise<PublicAccountArchiveResult>;
export {};
