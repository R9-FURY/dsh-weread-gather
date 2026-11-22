import { type Logger } from "../logger.js";
export interface BlobRef {
    sha256: string;
    byteLength: number;
    mediaType?: string;
}
export interface BlobStoreOptions {
    root: string;
    logger?: Logger;
}
/**
 * Content-addressed store for payload bytes.
 *
 * Bytes live here rather than in the database because they are large, streamable, and dedup across
 * accounts for free. The name of a blob is the digest of its contents, so a truncated write cannot
 * occupy a valid path: the file only acquires its name after the last byte is durable.
 */
export declare class BlobStore {
    #private;
    constructor(options: BlobStoreOptions);
    /**
     * Prepare the directories and confirm the filesystem can host the store.
     *
     * `link` is preferred but not required: it never clobbers, which gives first-writer-wins for
     * free. Where it is rejected -- exFAT, some FUSE mounts -- `rename` is equally safe here, because
     * two racing writers are storing byte-identical content by construction.
     */
    prepare(): Promise<void>;
    /**
     * Whether a payload is present and plausibly intact.
     *
     * Existence alone was not enough: a truncated file, a same-length substitution, or a directory
     * left at the path all reported present, and `ContentLibrary.has` promises callers they can skip
     * fetching. They would then get nothing. The digest is not recomputed here -- this runs per
     * lookup and the verified read path still catches substitution -- but type and length are cheap
     * and rule out the cases that actually occur.
     */
    has(ref: Pick<BlobRef, "sha256"> & {
        byteLength?: number;
    }): boolean;
    /** Read and verify a text blob synchronously for synchronous library availability checks. */
    readTextSync(ref: BlobRef): string | undefined;
    /** Store bytes already held in memory. */
    put(bytes: Uint8Array, meta?: {
        mediaType?: string;
    }): Promise<BlobRef>;
    /**
     * Store a stream, hashing as it is written.
     *
     * Memory stays bounded by one chunk regardless of the payload, which is what makes a large audio
     * track storable at all.
     */
    putStream(source: AsyncIterable<Uint8Array>, meta?: {
        mediaType?: string;
        signal?: AbortSignal;
    }): Promise<BlobRef>;
    /** Read a blob whole, verifying it. Returns undefined for anything unusable. */
    read(ref: BlobRef): Promise<Uint8Array | undefined>;
    readText(ref: BlobRef): Promise<string | undefined>;
    /** Copy a blob to a destination path, always verifying its digest. */
    writeTo(ref: BlobRef, destination: string): Promise<void>;
}
