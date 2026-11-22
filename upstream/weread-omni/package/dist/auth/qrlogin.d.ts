import { type ClientProfile } from "../profile.js";
import type { Credentials } from "./credentials.js";
export interface QrRequest {
    uuid: string;
    confirmUrl: string;
}
export interface AuthRequestOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    profile?: ClientProfile;
}
export declare function requestQr(fetchImpl?: typeof fetch, options?: AuthRequestOptions): Promise<QrRequest>;
export type LoginStatus = "scanned" | "confirmed";
export interface PollOptions extends AuthRequestOptions {
    pollTimeoutMs?: number;
    deadlineMs?: number;
    pollDelayMs?: number;
    onStatus?: (status: LoginStatus) => void | Promise<void>;
}
export declare function pollForCode(uuid: string, fetchImpl?: typeof fetch, options?: PollOptions): Promise<string>;
export declare function exchange(wxCode: string, deviceId: string, fetchImpl?: typeof fetch, options?: AuthRequestOptions): Promise<Credentials>;
export interface LoginOptions extends PollOptions {
    deviceId?: string;
    fetchImpl?: typeof fetch;
    onQr?: (confirmUrl: string) => void | Promise<void>;
}
export declare function login(options?: LoginOptions): Promise<Credentials>;
