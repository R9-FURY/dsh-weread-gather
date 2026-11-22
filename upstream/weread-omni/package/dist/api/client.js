import { captureClientSession, registerClientSessionProvider } from "./mobile-client.js";
/**
 * The canonical account client.
 *
 * Every operation runs on the E-Ink backend, which implements the whole canonical surface. The
 * class remains the seam extension clients build on -- it owns the session provider that lets a
 * multi-call operation pin one mobile session -- rather than a routing table over several backends.
 */
export class WeReadClient {
    search;
    book;
    shelf;
    publicAccounts;
    notes;
    review;
    readData;
    discover;
    ai;
    import;
    constructor({ eink }) {
        this.search = eink.search;
        this.book = eink.book;
        this.shelf = eink.shelf;
        this.publicAccounts = eink.publicAccounts;
        this.notes = eink.notes;
        this.review = eink.review;
        this.readData = eink.readData;
        this.discover = eink.discover;
        this.ai = eink.ai;
        this.import = eink.import;
        registerClientSessionProvider(this, () => captureClientSession(eink));
    }
}
//# sourceMappingURL=client.js.map