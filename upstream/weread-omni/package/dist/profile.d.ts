export interface ClientProfile {
    readonly versionHeaders: Record<string, string>;
    readonly deviceName: string;
    readonly deviceType: number;
    authHeaders(token: {
        vid: string;
        accessToken: string;
    }): Record<string, string>;
    refreshSignature(deviceId: string, timestamp: number, random: number, refreshToken: string): string;
    loginBodyExtras(): Record<string, unknown>;
    newDeviceId(): string;
    newInstallId(): string;
}
export declare function einkProfile(): ClientProfile;
export declare function resolveProfile(options: {
    profile?: ClientProfile;
}): ClientProfile;
