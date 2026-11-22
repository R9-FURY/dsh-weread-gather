import { randomUUID } from "node:crypto";
import { chmodSync, closeSync, constants, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AuthError } from "./errors.js";
import { CLIENT_ID_PATTERN } from "./plugin.js";
const MAX_STATE_BYTES = 1024 * 1024;
export const ACCOUNT_ALIAS_PATTERN = CLIENT_ID_PATTERN;
function checkedName(value, label) {
    if (!ACCOUNT_ALIAS_PATTERN.test(value)) {
        throw new AuthError(`invalid ${label} ${JSON.stringify(value)}: use lowercase letters, digits, "-" or "_"`);
    }
    return value;
}
function configRoot(env) {
    return env.WEREAD_CONFIG_DIR || join(homedir(), ".config", "weread");
}
export function accountsDirectory(env = process.env) {
    return join(configRoot(env), "accounts");
}
function configPath(env) {
    return join(configRoot(env), "config.json");
}
/** The alias recorded as the default, or undefined when none is set. */
export function loadDefaultAccount(env = process.env) {
    let value;
    try {
        value = jsonFile(configPath(env), "weread configuration");
    }
    catch (error) {
        if (error.cause?.code === "ENOENT")
            return undefined;
        throw error;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value) || value.version !== 1) {
        throw new AuthError("weread configuration has an unsupported version");
    }
    const alias = value.defaultAccount;
    if (alias === undefined || alias === null)
        return undefined;
    if (typeof alias !== "string" || !ACCOUNT_ALIAS_PATTERN.test(alias)) {
        throw new AuthError("weread configuration records an invalid default account");
    }
    return alias;
}
/** Record the default account, or clear it when alias is undefined. */
export function saveDefaultAccount(alias, env = process.env) {
    writeJson(configPath(env), alias === undefined ? { version: 1 } : { version: 1, defaultAccount: checkedName(alias, "account alias") });
}
function accountDirectory(alias, env) {
    return join(accountsDirectory(env), checkedName(alias, "account alias"));
}
function descriptorPath(alias, env) {
    return join(accountDirectory(alias, env), "account.json");
}
function statePath(alias, client, env) {
    return join(accountDirectory(alias, env), "clients", `${checkedName(client, "client id")}.json`);
}
function jsonFile(path, label) {
    let text;
    try {
        const size = statSync(path).size;
        if (size > MAX_STATE_BYTES)
            throw new AuthError(`${label} exceeds 1 MiB`);
        text = readFileSync(path, "utf8");
    }
    catch (cause) {
        if (cause instanceof AuthError)
            throw cause;
        throw new AuthError(`${label} could not be read`, { cause });
    }
    let value;
    try {
        value = JSON.parse(text);
    }
    catch (cause) {
        throw new AuthError(`${label} is not valid JSON`, { cause });
    }
    assertJsonValue(value);
    return value;
}
function assertJsonValue(value) {
    const pending = [{ value }];
    const ancestors = new Set();
    while (pending.length > 0) {
        const item = pending.pop();
        const current = item.value;
        if (item.leave) {
            ancestors.delete(current);
            continue;
        }
        if (current === null || typeof current === "string" || typeof current === "boolean")
            continue;
        if (typeof current === "number") {
            if (Number.isFinite(current))
                continue;
            throw new AuthError("account state numbers must be finite");
        }
        if (typeof current !== "object") {
            throw new AuthError("account state must contain only JSON values");
        }
        if (ancestors.has(current))
            throw new AuthError("account state must not contain cyclic objects");
        ancestors.add(current);
        pending.push({ value: current, leave: true });
        if (Object.getOwnPropertySymbols(current).length > 0) {
            throw new AuthError("account state must not contain symbol keys");
        }
        if (Array.isArray(current)) {
            const keys = Object.keys(current);
            if (keys.length !== current.length || keys.some((key, index) => key !== String(index))) {
                throw new AuthError("account state arrays must not be sparse or contain named properties");
            }
            pending.push(...current.map((entry) => ({ value: entry })));
            continue;
        }
        const prototype = Object.getPrototypeOf(current);
        if (prototype !== Object.prototype && prototype !== null) {
            throw new AuthError("account state must contain only plain objects");
        }
        pending.push(...Object.values(current).map((entry) => ({ value: entry })));
    }
}
function writeJson(path, value) {
    assertJsonValue(value);
    const contents = `${JSON.stringify(value, null, 2)}\n`;
    if (Buffer.byteLength(contents) > MAX_STATE_BYTES)
        throw new AuthError("account state exceeds 1 MiB");
    const directory = dirname(path);
    const temporary = join(directory, `.${process.pid}.${randomUUID()}.tmp`);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    let file;
    try {
        file = openSync(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
        writeFileSync(file, contents, "utf8");
        fsyncSync(file);
        closeSync(file);
        file = undefined;
        chmodSync(temporary, 0o600);
        renameSync(temporary, path);
        if (process.platform !== "win32") {
            const directoryHandle = openSync(directory, constants.O_RDONLY);
            try {
                fsyncSync(directoryHandle);
            }
            finally {
                closeSync(directoryHandle);
            }
        }
    }
    finally {
        if (file !== undefined)
            closeSync(file);
        rmSync(temporary, { force: true });
    }
}
export function loadAccountDescriptor(alias, env = process.env) {
    const value = jsonFile(descriptorPath(alias, env), `account ${JSON.stringify(alias)}`);
    if (value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        value.version !== 1 ||
        typeof value.client !== "string" ||
        !CLIENT_ID_PATTERN.test(value.client)) {
        throw new AuthError(`account ${JSON.stringify(alias)} has an unsupported descriptor`);
    }
    return { version: 1, client: value.client };
}
export function tryLoadAccountDescriptor(alias, env = process.env) {
    try {
        return loadAccountDescriptor(alias, env);
    }
    catch (error) {
        if (error.cause?.code === "ENOENT")
            return undefined;
        throw error;
    }
}
export function saveAccountDescriptor(alias, descriptor, env = process.env) {
    checkedName(alias, "account alias");
    checkedName(descriptor.client, "client id");
    writeJson(descriptorPath(alias, env), { version: 1, client: descriptor.client });
}
export function loadClientState(alias, client, env = process.env) {
    return jsonFile(statePath(alias, client, env), `state for account ${JSON.stringify(alias)}`);
}
export function tryLoadClientState(alias, client, env = process.env) {
    try {
        return loadClientState(alias, client, env);
    }
    catch (error) {
        if (error.cause?.code === "ENOENT")
            return undefined;
        throw error;
    }
}
export function saveClientState(alias, client, state, env = process.env) {
    writeJson(statePath(alias, client, env), state);
}
export function listAccountAliases(env = process.env) {
    let entries;
    try {
        entries = readdirSync(accountsDirectory(env), { withFileTypes: true });
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw new AuthError("account directory could not be read", { cause: error });
    }
    return entries
        .filter((entry) => entry.isDirectory() && ACCOUNT_ALIAS_PATTERN.test(entry.name))
        .map((entry) => entry.name)
        .filter((alias) => tryLoadAccountDescriptor(alias, env) !== undefined)
        .sort();
}
//# sourceMappingURL=account-store.js.map