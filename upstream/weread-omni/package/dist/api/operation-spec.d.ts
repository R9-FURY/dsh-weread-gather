/**
 * The declarative description of every projected operation.
 *
 * `PUBLIC_OPERATIONS` (`./operations.ts`) names the canonical operations and nothing else — it
 * is the stable root export and stays exactly that. This module is the part that was missing:
 * for each projected operation, the parameters it accepts, their **defaults**, and the write gate
 * it sits behind, in one place a projection can be generated from.
 *
 * Why it exists. The product's claim is that one surface is projected into the SDK, the CLI, and
 * the skill. That claim used to be maintained by hand in up to seven places per
 * operation — the name here, the option type in `types.ts`, the defaults in the resource module,
 * the JSON Schema, the argument mapping, an entry in a flat
 * 42-field argument bag, and the CLI flags — and merely *checked* afterwards by tests. Two
 * consequences that were not hypothetical:
 *
 * * **defaults were invisible.** `notes.best` returns 20 notes when `count` is omitted, but that
 *   number lived only inside `resources/notes.ts`. An agent reading the `weread_notes_best`
 *   schema could not learn it, and neither could `--help`.
 * * **the argument bag did not type anything.** Every tool shared one `ToolArguments` interface
 *   with 42 optional fields, so `args.maxIdx` type-checked inside the handler of a tool that has
 *   no `maxIdx`.
 *
 * This module is deliberately **not exported** from `src/index.ts` or `src/cli.ts`.
 * It is an internal spine, not a second public registry: freezing its shape would trade one
 * hand-maintained surface for another. Consumers that need the canonical list still read
 * `PUBLIC_OPERATIONS`.
 *
 * Declaring a default here is a claim about what the SDK actually sends. That claim is not taken
 * on trust: `test/integration/operation-defaults.test.ts` calls each operation with its required
 * arguments only and asserts the advertised default is the value that reaches the wire, including
 * for the handful that transform it first — an inverted flag, a per-catalog fan-out, a pagination
 * lookahead. A default that stops being sent has to be enumerated there, with a reason.
 */
import type { ReadDataOptions, ReadReviewQuery, SearchScope, StarRating } from "./types.js";
export declare const STAR_RATINGS: readonly [20, 40, 60, 80, 100];
export declare const READ_DATA_MODES: readonly ["weekly", "monthly", "annually", "overall"];
export declare const SEARCH_SCOPES: readonly [0, 2, 4, 6, 10, 12, 13, 14, 16];
export declare const PUBLIC_ACCOUNT_ID_PATTERN = "^MP_WXS_[0-9]+$";
/**
 * The write gates a projected operation can sit behind. The names classify what kind of write an
 * operation performs; `WEREAD_READONLY` closes all of them together.
 */
export type OperationGate = "upload" | "delete" | "shelf" | "review" | "notes";
type ReadDataMode = NonNullable<ReadDataOptions["mode"]>;
/** Books the shelf projection returns when the caller does not ask for a page size. */
export declare const DEFAULT_SHELF_COUNT = 50;
export declare const MAX_SHELF_COUNT = 200;
interface ParameterBase {
    readonly description: string;
}
export interface StringParameter extends ParameterBase {
    readonly kind: "string";
    readonly default?: string;
    readonly pattern?: string;
}
export interface IntegerParameter extends ParameterBase {
    readonly kind: "integer";
    readonly default?: number;
    readonly minimum?: number;
    readonly maximum?: number;
}
export interface BooleanParameter extends ParameterBase {
    readonly kind: "boolean";
    readonly default?: boolean;
}
/** The five-value WeRead star scale, kept as its own kind so it narrows to `StarRating`. */
export interface StarParameter extends ParameterBase {
    readonly kind: "star";
}
export interface ReadModeParameter extends ParameterBase {
    readonly kind: "readMode";
    readonly default?: ReadDataMode;
}
export interface SearchScopeParameter extends ParameterBase {
    readonly kind: "searchScope";
    readonly default?: SearchScope;
}
export interface ReviewQueriesParameter extends ParameterBase {
    readonly kind: "reviewQueries";
}
export type OperationParameter = StringParameter | IntegerParameter | BooleanParameter | StarParameter | ReadModeParameter | SearchScopeParameter | ReviewQueriesParameter;
interface ValueByKind {
    string: string;
    integer: number;
    boolean: boolean;
    star: StarRating;
    readMode: ReadDataMode;
    searchScope: SearchScope;
    reviewQueries: ReadReviewQuery[];
}
export type ParameterMap = Readonly<Record<string, OperationParameter>>;
export interface OperationSpec<P extends ParameterMap = ParameterMap, R extends readonly (keyof P & string)[] = readonly (keyof P & string)[]> {
    /** The `PUBLIC_OPERATIONS` namespace, or a non-canonical one (`upload`). */
    readonly resource: string;
    readonly action: string;
    /** One-line description of the operation. */
    readonly summary: string;
    readonly parameters: P;
    readonly required: R;
    readonly gate?: OperationGate;
    readonly destructive?: boolean;
    /** Static `_meta` for the projected tool. Dynamic meta (the upload widget) is merged later. */
    readonly meta?: Readonly<Record<string, unknown>>;
    /** JSON Schema keywords merged into the generated schema — `import.book`'s `oneOf`. */
    readonly schemaExtras?: Readonly<Record<string, unknown>>;
}
type ValueOf<P extends ParameterMap, K extends PropertyKey> = K extends keyof P ? ValueByKind[P[K]["kind"]] : never;
type Simplify<T> = {
    [K in keyof T]: T[K];
} & {};
/**
 * The arguments one operation accepts: its required parameters, plus its optional ones. Derived
 * from the spec, so a handler that reads a parameter its own tool does not declare fails to
 * compile — which the shared 42-field argument bag could never do.
 */
export type OperationArguments<S extends OperationSpec> = S extends OperationSpec<infer P, infer R> ? Simplify<{
    [K in R[number]]: ValueOf<P, K>;
} & {
    [K in Exclude<keyof P, R[number]>]?: ValueOf<P, K>;
}> : never;
/**
 * Every operation the CLI projects.
 * `test/unit/operation-spec.test.ts` asserts this set and `PUBLIC_OPERATIONS` stay in step.
 */
export declare const OPERATIONS: {
    readonly searchBooks: OperationSpec<{
        keyword: StringParameter;
        scope: SearchScopeParameter;
        count: IntegerParameter;
        maxIdx: IntegerParameter;
    }, readonly ["keyword"]>;
    readonly searchSuggest: OperationSpec<{
        keyword: StringParameter;
        count: IntegerParameter;
    }, readonly ["keyword"]>;
    readonly bookInfo: OperationSpec<{
        bookId: StringParameter;
    }, readonly ["bookId"]>;
    readonly bookDetail: OperationSpec<{
        bookId: StringParameter;
        count: IntegerParameter;
    }, readonly ["bookId"]>;
    readonly bookChapters: OperationSpec<{
        bookId: StringParameter;
    }, readonly ["bookId"]>;
    readonly bookProgress: OperationSpec<{
        bookId: StringParameter;
    }, readonly ["bookId"]>;
    readonly shelfSync: OperationSpec<{
        count: IntegerParameter;
        offset: IntegerParameter;
    }, readonly []>;
    readonly shelfAdd: OperationSpec<{
        bookId: StringParameter;
    }, readonly ["bookId"]>;
    readonly shelfDelete: OperationSpec<{
        bookId: StringParameter;
    }, readonly ["bookId"]>;
    readonly shelfPin: OperationSpec<{
        bookId: StringParameter;
        top: BooleanParameter;
    }, readonly ["bookId"]>;
    readonly shelfSetPrivate: OperationSpec<{
        bookId: StringParameter;
        secret: BooleanParameter;
    }, readonly ["bookId"]>;
    readonly shelfMarkFinished: OperationSpec<{
        bookId: StringParameter;
        finished: BooleanParameter;
    }, readonly ["bookId"]>;
    readonly shelfMarkReading: OperationSpec<{
        bookId: StringParameter;
        reading: BooleanParameter;
    }, readonly ["bookId"]>;
    readonly publicAccountsSubscriptions: OperationSpec<{
        count: IntegerParameter;
        offset: IntegerParameter;
    }, readonly []>;
    readonly publicAccountsArticles: OperationSpec<{
        accountId: StringParameter;
        count: IntegerParameter;
        synckey: IntegerParameter;
        offset: IntegerParameter;
    }, readonly ["accountId"]>;
    readonly publicAccountsResolveArticle: OperationSpec<{
        docUrl: StringParameter;
    }, readonly ["docUrl"]>;
    readonly publicAccountsPaidContent: OperationSpec<{
        docUrl: StringParameter;
    }, readonly ["docUrl"]>;
    readonly publicAccountsSubscribe: OperationSpec<{
        accountId: StringParameter;
    }, readonly ["accountId"]>;
    readonly publicAccountsUnsubscribe: OperationSpec<{
        accountId: StringParameter;
    }, readonly ["accountId"]>;
    readonly notesNotebooks: OperationSpec<{
        count: IntegerParameter;
        lastSort: IntegerParameter;
    }, readonly []>;
    readonly notesRecent: OperationSpec<{
        count: IntegerParameter;
    }, readonly []>;
    readonly notesBookmarks: OperationSpec<{
        bookId: StringParameter;
        synckey: IntegerParameter;
    }, readonly ["bookId"]>;
    readonly notesMine: OperationSpec<{
        bookId: StringParameter;
        count: IntegerParameter;
        synckey: IntegerParameter;
    }, readonly ["bookId"]>;
    readonly notesBest: OperationSpec<{
        bookId: StringParameter;
        chapterUid: IntegerParameter;
        count: IntegerParameter;
        maxIdx: IntegerParameter;
        synckey: IntegerParameter;
    }, readonly ["bookId"]>;
    readonly notesReadReviews: OperationSpec<{
        bookId: StringParameter;
        chapterUid: IntegerParameter;
        reviews: ReviewQueriesParameter;
    }, readonly ["bookId", "chapterUid", "reviews"]>;
    readonly notesUnderlines: OperationSpec<{
        bookId: StringParameter;
        chapterUid: IntegerParameter;
        synckey: IntegerParameter;
    }, readonly ["bookId", "chapterUid"]>;
    readonly notesAddBookmark: OperationSpec<{
        bookId: StringParameter;
        chapterUid: IntegerParameter;
        range: StringParameter;
        markText: StringParameter;
        type: IntegerParameter;
        style: IntegerParameter;
        colorStyle: IntegerParameter;
        bookVersion: IntegerParameter;
        chapterName: StringParameter;
        contextAbstract: StringParameter;
    }, readonly ["bookId", "chapterUid", "range", "markText"]>;
    readonly notesUpdateBookmark: OperationSpec<{
        bookmarkId: StringParameter;
        style: IntegerParameter;
        colorStyle: IntegerParameter;
    }, readonly ["bookmarkId", "style"]>;
    readonly notesRemoveBookmark: OperationSpec<{
        bookmarkId: StringParameter;
    }, readonly ["bookmarkId"]>;
    readonly reviewList: OperationSpec<{
        bookId: StringParameter;
        listType: IntegerParameter;
        listMode: IntegerParameter;
        mine: IntegerParameter;
        synckey: IntegerParameter;
        count: IntegerParameter;
        maxIdx: IntegerParameter;
    }, readonly ["bookId"]>;
    readonly reviewSingle: OperationSpec<{
        reviewId: StringParameter;
        commentsCount: IntegerParameter;
        commentsDirection: IntegerParameter;
        likesCount: IntegerParameter;
        likesDirection: IntegerParameter;
        synckey: IntegerParameter;
    }, readonly ["reviewId"]>;
    readonly reviewAdd: OperationSpec<{
        bookId: StringParameter;
        content: StringParameter;
        type: IntegerParameter;
        star: StarParameter;
        range: StringParameter;
        abstract: StringParameter;
        chapterUid: IntegerParameter;
    }, readonly ["bookId", "content"]>;
    readonly reviewEdit: OperationSpec<{
        reviewId: StringParameter;
        content: StringParameter;
    }, readonly ["reviewId", "content"]>;
    readonly reviewDelete: OperationSpec<{
        reviewId: StringParameter;
    }, readonly ["reviewId"]>;
    readonly readDataDetail: OperationSpec<{
        mode: ReadModeParameter;
        baseTime: IntegerParameter;
    }, readonly []>;
    readonly discoverRecommend: OperationSpec<{
        count: IntegerParameter;
        maxIdx: IntegerParameter;
    }, readonly []>;
    readonly discoverSimilar: OperationSpec<{
        bookId: StringParameter;
        count: IntegerParameter;
        maxIdx: IntegerParameter;
        sessionId: StringParameter;
    }, readonly ["bookId"]>;
    readonly aiAskBook: OperationSpec<{
        bookId: StringParameter;
        query: StringParameter;
        intent: StringParameter;
        maxPolls: IntegerParameter;
        delayCapMs: IntegerParameter;
    }, readonly ["bookId", "query"]>;
    readonly aiSuggest: OperationSpec<{
        bookId: StringParameter;
        chapterUid: IntegerParameter;
        toolbar: BooleanParameter;
        range: StringParameter;
        mpReviewId: StringParameter;
    }, readonly ["bookId"]>;
    readonly importBook: OperationSpec<{
        src_key: StringParameter;
        path: StringParameter;
        name: StringParameter;
        overrideUnknownOutcome: StringParameter;
    }, readonly ["name"]>;
};
/** Required parameters of kind `string`, which the projection rejects when blank. */
export declare function requiredTextParameters(spec: OperationSpec): readonly string[];
export declare function assertReadReviewQueries(reviews: unknown): asserts reviews is ReadReviewQuery[];
export declare function assertOperationParameter(name: string, parameter: OperationParameter, value: unknown): void;
export declare function assertOperationArguments(spec: OperationSpec, input: object): void;
export declare function parameterHelp(parameter: OperationParameter): string;
export {};
