import type { CosUploadInput } from "./types.js";
type CosMethod = (options: Record<string, unknown>) => Promise<unknown>;
export interface CosClient {
    putObject: CosMethod;
    sliceUploadFile: CosMethod;
    cancelTask(taskId: string): void;
}
export type CosConstructor = new (options: {
    getAuthorization: (options: unknown, callback: (authorization: Record<string, unknown>) => void) => void;
    Domain: string;
    Timeout: number;
}) => CosClient;
export interface CosUploadOptions extends CosUploadInput {
    region?: string;
    cosConstructor?: CosConstructor;
}
export declare function cosUpload(options: CosUploadOptions): Promise<void>;
export {};
