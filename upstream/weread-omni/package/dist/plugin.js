import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { PUBLIC_OPERATIONS } from "./api/operations.js";
export const CLIENT_PLUGIN_API_VERSION = 1;
export const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
function object(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function provider(value, label) {
    if (!object(value) || typeof value.login !== "function" || typeof value.open !== "function") {
        throw new TypeError(`${label} must provide login() and open()`);
    }
}
export function validateClientPlugin(value, source = "client plugin") {
    if (!object(value) || !object(value.meta) || !object(value.clients)) {
        throw new TypeError(`${source} must default-export a client plugin descriptor`);
    }
    const { meta } = value;
    if (typeof meta.name !== "string" || !meta.name.trim())
        throw new TypeError(`${source} has an invalid name`);
    if (typeof meta.version !== "string" || !meta.version.trim())
        throw new TypeError(`${source} has an invalid version`);
    if (meta.apiVersion !== CLIENT_PLUGIN_API_VERSION) {
        throw new TypeError(`${source} requires unsupported client plugin API ${String(meta.apiVersion)}`);
    }
    for (const [id, candidate] of Object.entries(value.clients)) {
        if (!CLIENT_ID_PATTERN.test(id))
            throw new TypeError(`${source} has invalid client id ${JSON.stringify(id)}`);
        provider(candidate, `${source} client ${JSON.stringify(id)}`);
    }
    if (value.cli !== undefined && typeof value.cli !== "function") {
        throw new TypeError(`${source} cli must be callable`);
    }
    return value;
}
export function registerClientPlugins(builtins, plugins) {
    const clients = new Map();
    const add = (id, providerValue, meta) => {
        if (!CLIENT_ID_PATTERN.test(id))
            throw new TypeError(`invalid client id ${JSON.stringify(id)}`);
        if (clients.has(id))
            throw new TypeError(`duplicate client id: ${id}`);
        provider(providerValue, `client ${JSON.stringify(id)}`);
        clients.set(id, Object.freeze({ id, provider: providerValue, plugin: Object.freeze({ ...meta }) }));
    };
    const core = { name: "weread-omni", version: PACKAGE_VERSION, apiVersion: CLIENT_PLUGIN_API_VERSION };
    for (const [id, value] of Object.entries(builtins))
        add(id, value, core);
    for (const candidate of plugins) {
        const plugin = validateClientPlugin(candidate);
        for (const [id, value] of Object.entries(plugin.clients))
            add(id, value, plugin.meta);
    }
    return clients;
}
function importSpecifier(value) {
    if (value.startsWith("file:"))
        return value;
    return isAbsolute(value) ? pathToFileURL(value).href : value;
}
export function pluginSpecifiers(env = process.env) {
    return (env.WEREAD_PLUGINS ?? "")
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean);
}
export async function loadClientPlugins(specifiers) {
    const plugins = [];
    for (const specifier of specifiers) {
        let module;
        try {
            module = (await import(importSpecifier(specifier)));
        }
        catch (cause) {
            throw new Error(`could not load client plugin ${JSON.stringify(specifier)}`, { cause });
        }
        plugins.push(validateClientPlugin(module.default, `client plugin ${JSON.stringify(specifier)}`));
    }
    return plugins;
}
export function assertCanonicalClient(value, label = "client") {
    if (!object(value))
        throw new TypeError(`${label} must be an object`);
    for (const [resource, methods] of Object.entries(PUBLIC_OPERATIONS)) {
        const namespace = value[resource];
        if (!object(namespace))
            throw new TypeError(`${label}.${resource} must be an object`);
        for (const method of methods) {
            if (typeof namespace[method] !== "function") {
                throw new TypeError(`${label}.${resource}.${method} must be callable`);
            }
        }
    }
}
//# sourceMappingURL=plugin.js.map