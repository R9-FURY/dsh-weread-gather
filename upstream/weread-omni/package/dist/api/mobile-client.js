import { loadCredentials, saveCredentials } from "../auth/credentials.js";
import { login as qrLogin } from "../auth/qrlogin.js";
import { TokenManager } from "../auth/token.js";
import { AuthError } from "../errors.js";
import { einkProfile } from "../profile.js";
import { MobileClient } from "./mobile.js";
import { createMobileResources } from "./resources/index.js";
const clientSessionProviders = new WeakMap();
/** @internal Captures one mobile session for a multi-call logical operation. */
export function captureClientSession(client) {
    const provider = clientSessionProviders.get(client);
    if (provider)
        return provider();
    if (client instanceof MobileApiClient)
        return { mobile: client.mobile, resources: client };
    if ("mobile" in client && client.mobile && typeof client.mobile === "object") {
        return { mobile: client.mobile, resources: client };
    }
    throw new TypeError("client does not expose a mobile session");
}
/** @internal Lets a wrapping client reuse one underlying mobile session for upload/import flows. */
export function registerClientSessionProvider(client, provider) {
    clientSessionProviders.set(client, provider);
}
export class MobileApiClient {
    search;
    book;
    shelf;
    publicAccounts;
    notes;
    review;
    readData;
    discover;
    ai;
    import;
    #credentials;
    #env;
    #profile;
    #store;
    #fetchImpl;
    #mobileBaseUrl;
    #mobileTimeoutMs;
    #logger;
    #onCredentials;
    #loggedInCredentials;
    /**
     * The `onCredentials` the current session was logged in with. Retained because that caller chose
     * where this session's secret goes; a later rotation of the SAME session falling back to the
     * constructor callback — or to the credential file — would write it somewhere they avoided.
     */
    #loginOnCredentials;
    #mobileClient;
    #credentialEpoch = 0;
    #credentialWriteTail = Promise.resolve();
    constructor(options = {}) {
        this.#credentials = options.credentials ? { ...options.credentials } : undefined;
        this.#env = options.env ?? process.env;
        this.#profile = options.profile ?? einkProfile();
        // The credential file this client reads. `weread-omni login` writes accounts elsewhere, so this
        // names a file for a direct SDK client or a `createProgram` embedder -- never for the shipped
        // `weread-omni` binary, which routes through AccountManager. An explicit "" is a deliberate request
        // for the unsuffixed store and is preserved; only an absent option falls back.
        this.#store = options.store ?? "eink";
        this.#fetchImpl = options.fetchImpl ?? fetch;
        this.#mobileBaseUrl = options.mobileBaseUrl;
        this.#mobileTimeoutMs = options.mobileTimeoutMs;
        this.#logger = options.logger;
        this.#onCredentials = options.onCredentials;
        const lazyMobile = {
            call: (method, path, callOptions) => this.mobile.call(method, path, callOptions),
        };
        const resourceDependencies = {
            ...options.resources,
            env: options.resources?.env ?? this.#env,
        };
        const resources = createMobileResources(lazyMobile, resourceDependencies);
        clientSessionProviders.set(this, () => {
            const mobile = this.mobile;
            return { mobile, resources: createMobileResources(mobile, resourceDependencies) };
        });
        const operationResources = () => {
            let mobile;
            const pinnedMobile = {
                call: (method, path, callOptions) => {
                    mobile ??= captureClientSession(this).mobile;
                    return mobile.call(method, path, callOptions);
                },
            };
            return createMobileResources(pinnedMobile, resourceDependencies);
        };
        this.search = resources.search;
        this.book = resources.book;
        this.shelf = resources.shelf;
        this.publicAccounts = resources.publicAccounts;
        this.notes = resources.notes;
        this.review = resources.review;
        this.readData = resources.readData;
        this.discover = resources.discover;
        this.ai = {
            ...resources.ai,
            askBook: async (input) => operationResources().ai.askBook(input),
        };
        this.import = {
            ...resources.import,
            book: async (input) => operationResources().import.book(input),
        };
    }
    get mobile() {
        if (!this.#mobileClient) {
            const explicit = this.#credentials !== undefined;
            const credentials = this.#loggedInCredentials ??
                loadCredentials({
                    credentials: this.#credentials,
                    env: this.#env,
                    store: this.#store,
                });
            const onCredentials = this.#loginOnCredentials ??
                this.#onCredentials ??
                (explicit ? undefined : (next) => saveCredentials(next, { env: this.#env, store: this.#store }));
            const sessionEpoch = this.#credentialEpoch;
            const tokenManager = new TokenManager(credentials, {
                fetchImpl: this.#fetchImpl,
                onCredentials: onCredentials
                    ? (next) => this.#enqueueCredentialWrite(() => {
                        if (sessionEpoch !== this.#credentialEpoch)
                            return;
                        return onCredentials(next);
                    })
                    : undefined,
                baseUrl: this.#mobileBaseUrl,
                timeoutMs: this.#mobileTimeoutMs,
                profile: this.#profile,
                logger: this.#logger,
            });
            this.#mobileClient = new MobileClient({
                tokenManager,
                fetchImpl: this.#fetchImpl,
                baseUrl: this.#mobileBaseUrl,
                timeoutMs: this.#mobileTimeoutMs,
                profile: this.#profile,
                logger: this.#logger,
            });
        }
        return this.#mobileClient;
    }
    async login(options = {}) {
        let deviceId = options.deviceId ?? this.#loggedInCredentials?.deviceId;
        if (deviceId === undefined) {
            try {
                deviceId = loadCredentials({
                    credentials: this.#credentials,
                    env: this.#env,
                    store: this.#store,
                }).deviceId;
            }
            catch (error) {
                const cause = error?.cause;
                if (!(error instanceof AuthError && cause?.code === "ENOENT"))
                    throw error;
            }
        }
        const credentials = await qrLogin({
            ...options,
            deviceId,
            fetchImpl: options.fetchImpl ?? this.#fetchImpl,
            profile: this.#profile,
        });
        const persist = options.onCredentials ?? this.#onCredentials;
        await this.#enqueueCredentialWrite(async () => {
            if (persist) {
                await persist({ ...credentials });
            }
            else if (this.#credentials === undefined) {
                saveCredentials(credentials, { env: this.#env, store: this.#store });
            }
            this.#credentialEpoch += 1;
            this.#loginOnCredentials = options.onCredentials;
            this.#loggedInCredentials = { ...credentials };
            this.#mobileClient = undefined;
        });
        return credentials;
    }
    #enqueueCredentialWrite(write) {
        const queued = this.#credentialWriteTail.then(write);
        this.#credentialWriteTail = queued.catch(() => undefined);
        return queued;
    }
    reloadCredentials() {
        this.#credentialEpoch += 1;
        this.#loggedInCredentials = undefined;
        this.#loginOnCredentials = undefined;
        this.#mobileClient = undefined;
    }
}
export const createEinkClient = (options = {}) => new MobileApiClient({ ...options, profile: einkProfile() });
//# sourceMappingURL=mobile-client.js.map