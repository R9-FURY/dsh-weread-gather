import type { DatabaseSync } from "node:sqlite";
import { type Logger } from "../logger.js";
/**
 * Whether a database file was already present but carried no schema.
 *
 * That is the fingerprint of `library.db` copied without its write-ahead log: the schema and
 * `PRAGMA user_version` both live on page one, so the migration sees version zero and rebuilds an
 * empty schema. Checking afterwards cannot distinguish it from a new library -- the evidence is
 * gone by then, so it is captured here.
 */
export interface OpenedDatabase {
    database: DatabaseSync;
    schemaWasMissingFromExistingFile: boolean;
}
export interface OpenDatabaseOptions {
    path: string;
    logger?: Logger;
    /**
     * Proceed even when the filesystem cannot support write-ahead logging. Off by default: the
     * fallback is not graceful, it locks other processes out entirely.
     */
    allowUnsafe?: boolean;
}
/**
 * Open the library database, applying the schema on first use.
 *
 * Refuses rather than degrades when write-ahead logging is unavailable. `journal_mode = DELETE`
 * with `locking_mode = EXCLUSIVE` is the usual advice for a filesystem without shared memory, but
 * exclusive locking holds the lock until the connection closes: a second `weread` process then
 * fails on its own pragma sequence, before it has anything to degrade into a cache miss. Refusing
 * lets the caller run without a library, which is a real degradation.
 */
export declare function openDatabase(options: OpenDatabaseOptions): Promise<OpenedDatabase>;
/**
 * Run `work` inside an immediate transaction.
 *
 * `BEGIN IMMEDIATE`, not the default deferred mode. A deferred transaction that reads and then
 * writes can fail with `SQLITE_BUSY_SNAPSHOT` when another connection commits in between, and
 * SQLite deliberately does not invoke the busy handler for it -- waiting cannot rescue a stale read
 * snapshot. Every replace-on-newer path here reads before it writes.
 */
export declare function transact<T>(database: DatabaseSync, work: () => T): T;
/**
 * Retry a synchronous database operation across event-loop turns.
 *
 * The busy timeout is kept small precisely so that contention surfaces here, where waiting yields
 * the thread instead of blocking it.
 */
export declare function withRetry<T>(work: () => T, options?: {
    attempts?: number;
    delayMs?: number;
}): Promise<T>;
