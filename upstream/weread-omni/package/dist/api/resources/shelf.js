import { assertOperationArguments, OPERATIONS } from "../operation-spec.js";
import { expectArrayFields } from "../response-guards.js";
const shelfBody = (bookId) => ({ albumIds: [], archiveIds: [], bookIds: [bookId] });
export function shelfModule(mobile) {
    return {
        sync: (options = {}) => mobile
            .call("GET", "/shelf/sync", { signal: options.signal })
            .then((response) => expectArrayFields(response, "/shelf/sync", ["books"], ["albums", "archive"])),
        add: (bookId, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfAdd, { bookId });
            return mobile
                .call("POST", "/shelf/add", { body: shelfBody(bookId), signal: options.signal })
                .then((response) => response.body);
        },
        delete: (bookId, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfDelete, { bookId });
            return mobile
                .call("POST", "/shelf/delete", { body: shelfBody(bookId), signal: options.signal })
                .then((response) => response.body);
        },
        pin: (bookId, top = true, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfPin, { bookId, top });
            return mobile
                .call("POST", "/shelf/top", {
                body: { ...shelfBody(bookId), isDel: top ? 0 : 1 },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
        setPrivate: (bookId, on = true, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfSetPrivate, { bookId, secret: on });
            return mobile
                .call("POST", "/book/secret", {
                body: { albumIds: [], bookIds: [bookId], private: on ? 1 : 0 },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
        markFinished: (bookId, on = true, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfMarkFinished, { bookId, finished: on });
            return mobile
                .call("POST", "/book/markstatus", {
                body: { auto: 0, bookId, finishInfo: 0, isCancel: on ? 0 : 1, status: 4 },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
        markReading: (bookId, on = true, options = {}) => {
            assertOperationArguments(OPERATIONS.shelfMarkReading, { bookId, reading: on });
            return mobile
                .call("POST", "/book/markstatus", {
                body: { auto: 0, bookId, finishInfo: 0, isCancel: on ? 0 : 1, status: 2 },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
    };
}
//# sourceMappingURL=shelf.js.map