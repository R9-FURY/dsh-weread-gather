import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { WeReadError } from "../errors.js";
const EXTENSIONS = new Set(["epub", "pdf", "mobi", "txt", "azw3"]);
/**
 * A copy, not the validator's own set: this is public API, and handing out the live Set let a
 * consumer call .add() and widen upload validation process-wide.
 */
export const ALLOWED_EXT = new Set(EXTENSIONS);
export class BookValidationError extends WeReadError {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export function maxUploadBytes(env = process.env) {
    const value = Number(env.WEREAD_MAX_UPLOAD_BYTES || 200 * 1024 * 1024);
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error("WEREAD_MAX_UPLOAD_BYTES must be a positive integer");
    }
    return value;
}
const extensionOf = (name) => (name.split(".").pop() || "").toLowerCase();
export function assertBook(name, size, env = process.env) {
    const extension = extensionOf(name);
    if (!EXTENSIONS.has(extension)) {
        throw new BookValidationError("unsupported-format", `unsupported format ".${extension}" (allowed: ${[...EXTENSIONS].join(", ")})`);
    }
    const limit = maxUploadBytes(env);
    if (size > limit) {
        throw new BookValidationError("too-large", `file too large (${size} > ${limit} bytes)`);
    }
}
async function readOpenedBook(file, info, name, env) {
    if (!info.isFile())
        throw new Error("local path must be a regular file");
    assertBook(name, info.size, env);
    const limit = maxUploadBytes(env);
    const destination = Buffer.allocUnsafe(info.size);
    let size = 0;
    while (size < destination.length) {
        const { bytesRead } = await file.read(destination, size, destination.length - size);
        if (bytesRead === 0)
            return destination.subarray(0, size);
        size += bytesRead;
    }
    const extra = Buffer.allocUnsafe(1);
    const { bytesRead: extraBytes } = await file.read(extra, 0, 1);
    if (extraBytes === 0)
        return destination;
    size += extraBytes;
    assertBook(name, size, env);
    const chunks = [destination, extra];
    while (size < limit) {
        const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, limit - size));
        const { bytesRead } = await file.read(chunk, 0, chunk.length);
        if (bytesRead === 0)
            break;
        chunks.push(chunk.subarray(0, bytesRead));
        size += bytesRead;
    }
    if (size === limit) {
        const overflow = Buffer.allocUnsafe(1);
        const { bytesRead } = await file.read(overflow, 0, 1);
        if (bytesRead > 0) {
            chunks.push(overflow);
            size += bytesRead;
        }
    }
    assertBook(name, size, env);
    return Buffer.concat(chunks, size);
}
export async function readBookFile(name, filePath, env = process.env) {
    const file = await open(filePath, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
        return await readOpenedBook(file, await file.stat(), name, env);
    }
    finally {
        await file.close();
    }
}
//# sourceMappingURL=import-guards.js.map