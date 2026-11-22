import { assertOperationArguments, OPERATIONS } from "../operation-spec.js";
import { expectArrayFields } from "../response-guards.js";
/** Every list `/readdata/detail` can carry is optional upstream, so each is checked only if present. */
const READ_DATA_LISTS = [
    "readStat",
    "readLongest",
    "preferCategory",
    "preferTime",
    "preferAuthor",
    "preferPublisher",
    "preferCp",
    "medals",
    "preferBooks",
    "yearReport",
    "readTimeGears",
];
export function readDataModule(mobile) {
    return {
        detail(options = {}) {
            const mode = options.mode ?? "monthly";
            assertOperationArguments(OPERATIONS.readDataDetail, { mode, baseTime: options.baseTime });
            return mobile
                .call("GET", "/readdata/detail", {
                query: { mode, baseTime: options.baseTime },
                signal: options.signal,
            })
                .then((response) => expectArrayFields(response, "/readdata/detail", [], READ_DATA_LISTS));
        },
    };
}
//# sourceMappingURL=read-data.js.map