import { assertOperationArguments, OPERATIONS } from "../operation-spec.js";
import { expectArrayFields } from "../response-guards.js";
export function searchModule(mobile) {
    return {
        books(keyword, options = {}) {
            const scope = options.scope ?? 10;
            assertOperationArguments(OPERATIONS.searchBooks, {
                keyword,
                scope,
                count: options.count,
                maxIdx: options.maxIdx,
            });
            return mobile
                .call("GET", "/store/search", {
                query: {
                    keyword,
                    scope,
                    count: options.count,
                    maxIdx: options.maxIdx ?? 0,
                },
                signal: options.signal,
            })
                .then((response) => expectArrayFields(response, "/store/search", ["books"], ["parts"]));
        },
        suggest(keyword, options = {}) {
            const count = options.count ?? 10;
            assertOperationArguments(OPERATIONS.searchSuggest, { keyword, count });
            return mobile
                .call("GET", "/store/suggest", {
                query: { keyword, count },
                signal: options.signal,
            })
                .then((response) => expectArrayFields(response, "/store/suggest", ["list", "records", "parts"]));
        },
    };
}
//# sourceMappingURL=search.js.map