export { AccountManager, } from "./accounts.js";
export { WeReadClient, } from "./api/client.js";
export { ALLOWED_EXT, BookValidationError } from "./api/import-guards.js";
export { MobileClient, } from "./api/mobile.js";
export { createEinkClient, MobileApiClient, } from "./api/mobile-client.js";
export { PUBLIC_OPERATIONS } from "./api/operations.js";
export { ImportPhaseError, isAmbiguousImportOutcome, } from "./api/resources/import.js";
export { loadCredentials, saveCredentials, storePath, } from "./auth/credentials.js";
export { exchange, login, pollForCode, requestQr, } from "./auth/qrlogin.js";
export { mintAccessToken, TokenManager, } from "./auth/token.js";
export { applyConnectAttemptTimeout } from "./connect-timeout.js";
export { deviceVersionHeaders, einkDevice } from "./device-ua.js";
export { AuthError, TransportError, toTransportError, WeReadApiError, WeReadError } from "./errors.js";
// The local content library. Deliberately narrow: the store, the decorator that puts it in front
// of a client, the root resolver, and the typed failures. Row shapes stay internal until a
// consumer needs them, because every name here is a permanent contract.
export { ContentLibrary, LibraryError, LibraryStoreError, LibraryUnsupportedError, LibraryVersionError, libraryRoot, withContentLibrary, } from "./library/index.js";
export { einkProfile, resolveProfile } from "./profile.js";
export { buildPublicAccountFeed, exportPublicAccountArchive, PublicAccountArtifactError, PublicAccountReadError, readPublicAccountArticle, } from "./public-accounts.js";
//# sourceMappingURL=index.js.map