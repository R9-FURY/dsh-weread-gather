export declare const PUBLIC_OPERATIONS: {
    readonly search: readonly ["books", "suggest"];
    readonly book: readonly ["info", "detail", "chapters", "progress"];
    readonly shelf: readonly ["sync", "add", "delete", "pin", "setPrivate", "markFinished", "markReading"];
    readonly publicAccounts: readonly ["subscriptions", "articles", "resolveArticle", "paidContent", "subscribe", "unsubscribe"];
    readonly notes: readonly ["notebooks", "recent", "bookmarks", "mine", "best", "readReviews", "underlines", "addBookmark", "updateBookmark", "removeBookmark"];
    readonly review: readonly ["list", "single", "add", "edit", "delete"];
    readonly readData: readonly ["detail"];
    readonly discover: readonly ["recommend", "similar"];
    readonly ai: readonly ["askBook", "suggest"];
    readonly import: readonly ["book"];
};
