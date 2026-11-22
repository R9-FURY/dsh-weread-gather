import { ACCOUNT_ALIAS_PATTERN, listAccountAliases, loadAccountDescriptor, loadClientState, loadDefaultAccount, saveAccountDescriptor, saveClientState, saveDefaultAccount, tryLoadAccountDescriptor, tryLoadClientState, } from "./account-store.js";
import { einkProvider } from "./eink-provider.js";
import { AuthError } from "./errors.js";
import { assertCanonicalClient, registerClientPlugins, } from "./plugin.js";
function checkedAlias(alias) {
    if (!ACCOUNT_ALIAS_PATTERN.test(alias)) {
        throw new AuthError(`invalid account alias ${JSON.stringify(alias)}: use lowercase letters, digits, "-" or "_"`);
    }
    return alias;
}
function checkedIdentity(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new AuthError("client provider returned an invalid identity");
    }
    const { vid, deviceId } = value;
    if (typeof vid !== "string" ||
        vid.trim().length === 0 ||
        (deviceId !== undefined && (typeof deviceId !== "string" || deviceId.length === 0))) {
        throw new AuthError("client provider returned an invalid identity");
    }
    return { vid, ...(deviceId === undefined ? {} : { deviceId }) };
}
function adaptPluginClient(value) {
    const search = value.search;
    if (search !== null && typeof search === "object" && !Array.isArray(search) && !("suggest" in search)) {
        return {
            ...value,
            search: {
                ...search,
                suggest: async () => {
                    throw new Error("client plugin does not implement search.suggest");
                },
            },
        };
    }
    return value;
}
export class AccountManager {
    #env;
    #fetchImpl;
    #clients;
    constructor(options = {}) {
        this.#env = options.env ?? process.env;
        this.#fetchImpl = options.fetchImpl ?? fetch;
        this.#clients = registerClientPlugins({ eink: einkProvider }, options.plugins ?? []);
    }
    clients() {
        return [...this.#clients.values()].map(({ id, plugin }) => ({
            client: id,
            plugin: plugin.name,
            version: plugin.version,
            apiVersion: plugin.apiVersion,
        }));
    }
    accounts() {
        return listAccountAliases(this.#env).map((account) => ({
            account,
            client: loadAccountDescriptor(account, this.#env).client,
        }));
    }
    /**
     * The account used when a caller names none: `WEREAD_ACCOUNT` first, then the
     * recorded default. A stale value — an alias that no longer has an account —
     * is ignored rather than fatal, so removing an account cannot wedge the CLI.
     */
    defaultAccount() {
        const configured = new Set(listAccountAliases(this.#env));
        const requested = this.#env.WEREAD_ACCOUNT?.trim();
        if (requested && ACCOUNT_ALIAS_PATTERN.test(requested) && configured.has(requested))
            return requested;
        const recorded = loadDefaultAccount(this.#env);
        return recorded !== undefined && configured.has(recorded) ? recorded : undefined;
    }
    setDefaultAccount(aliasInput) {
        const alias = checkedAlias(aliasInput);
        const descriptor = loadAccountDescriptor(alias, this.#env);
        saveDefaultAccount(alias, this.#env);
        return { account: alias, client: descriptor.client };
    }
    clearDefaultAccount() {
        saveDefaultAccount(undefined, this.#env);
    }
    select(requested = []) {
        const selected = requested.map(checkedAlias);
        if (new Set(selected).size !== selected.length)
            throw new AuthError("duplicate account selection");
        if (selected.length > 0) {
            for (const alias of selected)
                loadAccountDescriptor(alias, this.#env);
            return selected;
        }
        const configured = listAccountAliases(this.#env);
        if (configured.length === 0)
            throw new AuthError("no WeRead accounts are configured; run weread-omni login");
        if (configured.length === 1)
            return configured;
        const preferred = this.defaultAccount();
        if (preferred !== undefined)
            return [preferred];
        throw new AuthError(`multiple WeRead accounts are configured (${configured.join(", ")}); pass --account, or set a default with "weread-omni accounts use <alias>"`);
    }
    async login(aliasInput, options) {
        const alias = checkedAlias(aliasInput);
        const existing = tryLoadAccountDescriptor(alias, this.#env);
        const clientId = options.client ?? existing?.client ?? "eink";
        const registration = this.#clients.get(clientId);
        if (!registration)
            throw new AuthError(`no loaded client provider supplies ${JSON.stringify(clientId)}`);
        const previousState = tryLoadClientState(alias, clientId, this.#env);
        const result = await registration.provider.login({
            previousState,
            env: this.#env,
            fetchImpl: this.#fetchImpl,
            signal: options.signal,
            onQr: options.onQr,
            onStatus: options.onStatus,
            onOtp: options.onOtp,
        });
        const identity = checkedIdentity(result.identity);
        saveClientState(alias, clientId, result.state, this.#env);
        saveAccountDescriptor(alias, { version: 1, client: clientId }, this.#env);
        return { account: alias, client: clientId, ...identity };
    }
    async open(aliasInput) {
        const alias = checkedAlias(aliasInput);
        const descriptor = loadAccountDescriptor(alias, this.#env);
        const registration = this.#clients.get(descriptor.client);
        if (!registration) {
            throw new AuthError(`account ${JSON.stringify(alias)} requires client ${JSON.stringify(descriptor.client)}, but no loaded plugin provides it`);
        }
        const state = loadClientState(alias, descriptor.client, this.#env);
        let tail = Promise.resolve();
        const saveState = (next) => {
            const write = tail.then(() => saveClientState(alias, descriptor.client, next, this.#env));
            tail = write.catch(() => undefined);
            return write;
        };
        const opened = await registration.provider.open({
            state,
            env: this.#env,
            fetchImpl: this.#fetchImpl,
            saveState,
        });
        const canonical = adaptPluginClient(opened.client);
        assertCanonicalClient(canonical, `client ${JSON.stringify(descriptor.client)}`);
        const identity = checkedIdentity(opened.identity);
        return {
            account: alias,
            client: descriptor.client,
            canonical,
            identity,
        };
    }
}
//# sourceMappingURL=accounts.js.map