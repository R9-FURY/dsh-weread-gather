import { assertOperationArguments, OPERATIONS } from "../operation-spec.js";
import { expectArrayFields } from "../response-guards.js";
export function reviewModule(mobile) {
    return {
        list(bookId, options = {}) {
            const listType = options.listType ?? 1;
            const listMode = options.listMode ?? 0;
            const mine = options.mine ?? 0;
            const synckey = options.synckey ?? 0;
            const count = options.count ?? 20;
            const maxIdx = options.maxIdx ?? 0;
            assertOperationArguments(OPERATIONS.reviewList, {
                bookId,
                listType,
                listMode,
                mine,
                synckey,
                count,
                maxIdx,
            });
            const pageEnd = maxIdx + count;
            if (synckey === 0 && !Number.isSafeInteger(pageEnd + 1)) {
                throw new RangeError("maxIdx + count must leave room for a safe pagination lookahead");
            }
            return mobile
                .call("GET", "/review/list", {
                query: {
                    bookId,
                    listType,
                    listMode,
                    mine,
                    synckey,
                    count: synckey === 0 ? pageEnd + 1 : count,
                    maxIdx: synckey === 0 ? 0 : maxIdx,
                },
                signal: options.signal,
            })
                .then((response) => expectArrayFields(response, "/review/list", ["reviews"], ["friendCommentUsers"]))
                .then((response) => {
                if (synckey !== 0)
                    return response;
                // The endpoint widens a prefix with count and returns no later results for maxIdx > 0.
                // Fetch one item beyond the requested window, then expose a conventional disjoint page.
                const reviews = response.reviews.slice(maxIdx, pageEnd);
                const hasMore = response.reviews.length > pageEnd || response.hasMore === 1;
                return { ...response, reviews, hasMore: hasMore ? 1 : 0 };
            });
        },
        single(reviewId, options = {}) {
            const commentsCount = options.commentsCount ?? 10;
            const commentsDirection = options.commentsDirection ?? 0;
            const likesCount = options.likesCount ?? 10;
            const likesDirection = options.likesDirection ?? 0;
            const synckey = options.synckey ?? 0;
            assertOperationArguments(OPERATIONS.reviewSingle, {
                reviewId,
                commentsCount,
                commentsDirection,
                likesCount,
                likesDirection,
                synckey,
            });
            return mobile
                .call("GET", "/review/single", {
                query: {
                    reviewId,
                    commentsCount,
                    commentsDirection,
                    likesCount,
                    likesDirection,
                    synckey,
                },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
        add(input) {
            assertOperationArguments(OPERATIONS.reviewAdd, input);
            const body = {
                bookId: input.bookId,
                content: input.content,
                type: input.type ?? 1,
            };
            if (input.star !== undefined)
                body.star = input.star;
            if (input.range)
                body.range = input.range;
            if (input.abstract)
                body.abstract = input.abstract;
            if (input.chapterUid !== undefined)
                body.chapterUid = input.chapterUid;
            return mobile
                .call("POST", "/review/add", { body, signal: input.signal })
                .then((response) => response.body);
        },
        edit(reviewId, content, options = {}) {
            assertOperationArguments(OPERATIONS.reviewEdit, { reviewId, content });
            return mobile
                .call("POST", "/review/useredit", {
                body: { reviewId, content },
                signal: options.signal,
            })
                .then((response) => response.body);
        },
        delete: (reviewId, options = {}) => {
            assertOperationArguments(OPERATIONS.reviewDelete, { reviewId });
            return mobile
                .call("POST", "/review/delete", { body: { reviewId }, signal: options.signal })
                .then((response) => response.body);
        },
    };
}
//# sourceMappingURL=review.js.map