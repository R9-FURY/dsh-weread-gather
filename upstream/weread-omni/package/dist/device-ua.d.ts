export interface MobileDevice {
    userAgent: string;
    baseapi: string;
    appver: string;
    osver: string;
    channelId: string;
    deviceName: string;
    wrbrand: string;
}
/** The public package's single, stable e-ink device identity. */
export declare function einkDevice(): MobileDevice;
export declare function deviceVersionHeaders(device: MobileDevice): Record<string, string>;
