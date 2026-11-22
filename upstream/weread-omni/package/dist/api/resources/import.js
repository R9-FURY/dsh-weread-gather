import { TransportError, toTransportError, WeReadApiError, WeReadError } from "../../errors.js";
import { cosUpload } from "../cos-upload.js";
import { assertBook, readBookFile } from "../import-guards.js";
import { assertOperationArguments, assertOperationParameter, OPERATIONS } from "../operation-spec.js";
import { waitUnlessAborted } from "../signal.js";
export class ImportPhaseError extends WeReadError {
    phase;
    ambiguous;
    digest;
    constructor(message, info) {
        super(message, info.cause !== undefined ? { cause: info.cause } : undefined);
        this.phase = info.phase;
        this.ambiguous = info.ambiguous;
        this.digest = info.digest;
    }
}
export const isAmbiguousImportOutcome = (error) => error instanceof ImportPhaseError && error.ambiguous;
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
export function importModule(mobile, upload = cosUpload, env = process.env) {
    return {
        async book(input) {
            assertOperationParameter("name", OPERATIONS.importBook.parameters.name, input.name);
            if (!input.name.trim())
                throw new Error("import filename must not be empty");
            assertOperationArguments(OPERATIONS.importBook, { name: input.name, path: input.path });
            const hasBytes = input.bytes !== undefined;
            const hasPath = input.path !== undefined;
            if (hasBytes === hasPath)
                throw new Error("import requires exactly one of bytes or path");
            let bytes;
            if (hasBytes) {
                const source = input.bytes;
                assertBook(input.name, source.byteLength, env);
                bytes = Buffer.isBuffer(source) ? source : Buffer.from(source);
            }
            else {
                bytes = await readBookFile(input.name, input.path, env);
            }
            if (bytes.length === 0)
                throw new Error("import bytes must not be empty");
            const baseName = input.name.replace(/\.[^./\\]+$/, "");
            const credentialResponse = await mobile.call("GET", "/cos/getcredential", {
                query: { name: baseName, from: "" },
                signal: input.signal,
            });
            const credential = credentialResponse.body;
            const temporary = credential.Response;
            const cosCredentials = temporary?.Credentials;
            if (!credential.bucket ||
                !credential.ObjectName ||
                !cosCredentials ||
                !isNonEmptyString(cosCredentials.TmpSecretId) ||
                !isNonEmptyString(cosCredentials.TmpSecretKey) ||
                !isNonEmptyString(cosCredentials.Token) ||
                typeof temporary.ExpiredTime !== "number") {
                throw new WeReadApiError("WeRead COS credential response is incomplete", {
                    path: "/cos/getcredential",
                    status: credentialResponse.status,
                });
            }
            const uploadPromise = upload({
                bucket: credential.bucket,
                key: credential.ObjectName.replace(/^\//, ""),
                credentials: cosCredentials,
                expiredTime: temporary.ExpiredTime,
                bytes,
                signal: input.signal,
            });
            if (upload === cosUpload) {
                // The default uploader removes its mode-0600 temporary file in a finally block. Let that
                // cleanup finish before reporting cancellation to the caller.
                await uploadPromise;
            }
            else {
                // Injected uploaders are not required to observe AbortSignal and may never settle.
                await waitUnlessAborted(uploadPromise, "import.book", input.signal);
            }
            // Checked here rather than left to `/cos/notify` to reject: an abort that lands during the
            // COS upload means the notification was never sent, so the import definitively did not
            // happen. Letting the catch below classify it would report an *ambiguous* outcome for a
            // case that is not ambiguous at all.
            if (input.signal?.aborted)
                throw toTransportError(input.signal.reason, "import.book");
            let notification;
            try {
                notification = await mobile
                    .call("POST", "/cos/notify", {
                    query: { name: input.name, path: credential.ObjectName, cancel: "0" },
                    body: {},
                    signal: input.signal,
                })
                    .then((response) => response.body);
            }
            catch (error) {
                const ambiguous = error instanceof WeReadApiError || error instanceof TransportError
                    ? error.ambiguous
                    : !(error instanceof WeReadError);
                throw new ImportPhaseError(ambiguous
                    ? "WeRead COS notification response was lost; import outcome is unknown"
                    : "WeRead COS notification failed", {
                    phase: "post-notify",
                    ambiguous,
                    cause: error,
                });
            }
            if (notification.status === 1) {
                if (isNonEmptyString(notification.bookId)) {
                    return {
                        bookId: notification.bookId,
                        deepLink: `https://weread.qq.com/web/reader/${notification.bookId}`,
                    };
                }
                throw new ImportPhaseError("WeRead COS notification succeeded without a book id", {
                    phase: "post-notify",
                    ambiguous: true,
                });
            }
            throw new ImportPhaseError("WeRead COS notification failed", {
                phase: "post-notify",
                ambiguous: false,
            });
        },
    };
}
//# sourceMappingURL=import.js.map