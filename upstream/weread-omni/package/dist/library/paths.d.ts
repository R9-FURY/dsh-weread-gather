/**
 * Root of the local content library.
 *
 * Deliberately not `WEREAD_CONFIG_DIR`. That directory is documented as secret-bearing ("treat as
 * an SSH private key" in SECURITY.md) and its reader caps state at 1 MiB; this one holds unbounded
 * bulk content with a different backup and retention profile.
 *
 * `XDG_DATA_HOME` is honoured even though the config root ignores `XDG_CONFIG_HOME`. The asymmetry
 * is intentional: relocating bulk data onto another volume is something people actually do.
 */
export declare function libraryRoot(env?: NodeJS.ProcessEnv): string;
export declare function databasePath(root: string): string;
export declare function blobsDirectory(root: string): string;
export declare function stagingDirectory(root: string): string;
/**
 * Path of one blob, sharded by the first byte of its digest.
 *
 * `digest` must already have passed `checkedDigest`; this function does not re-validate, because it
 * is called on every read and the callers that accept untrusted input are the ones that validate.
 */
export declare function blobPath(root: string, digest: string): string;
/**
 * Reject anything that is not a lowercase hex SHA-256.
 *
 * A digest becomes a path component, so this is a path-safety boundary and not merely a shape
 * check. The database carries the same rule as a CHECK constraint; both exist on purpose, because
 * the constraint cannot run before the file has already been written.
 */
export declare function checkedDigest(digest: string): string;
/**
 * Reject identifiers that cannot be stored as a key.
 *
 * `bookId` is declared free-form upstream, so it can be numeric, `CB_…` or `MP_WXS_…`. None of it
 * reaches the filesystem — identity lives in database columns — but a control character would
 * still corrupt diagnostics and comparisons.
 */
export declare function checkedIdentifier(value: string, label: string): string;
/** Reject a chapter identifier that is not a non-negative safe integer. */
export declare function checkedChapterUid(value: number): number;
