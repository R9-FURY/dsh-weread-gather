import type { MobileTransport, ReadDataOptions, ReadDataResponse } from "../types.js";
export declare function readDataModule(mobile: MobileTransport): {
    detail(options?: ReadDataOptions): Promise<ReadDataResponse>;
};
