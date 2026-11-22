import { aiModule } from "./ai.js";
import { bookModule } from "./book.js";
import { discoverModule } from "./discover.js";
import { importModule } from "./import.js";
import { notesModule } from "./notes.js";
import { publicAccountsModule } from "./public-accounts.js";
import { readDataModule } from "./read-data.js";
import { reviewModule } from "./review.js";
import { searchModule } from "./search.js";
import { shelfModule } from "./shelf.js";
export function createMobileResources(mobile, dependencies = {}) {
    return {
        search: searchModule(mobile),
        book: bookModule(mobile),
        shelf: shelfModule(mobile),
        publicAccounts: publicAccountsModule(mobile),
        notes: notesModule(mobile),
        review: reviewModule(mobile),
        readData: readDataModule(mobile),
        discover: discoverModule(mobile),
        ai: aiModule(mobile, dependencies.sleep),
        import: importModule(mobile, dependencies.cosUpload, dependencies.env),
    };
}
//# sourceMappingURL=index.js.map