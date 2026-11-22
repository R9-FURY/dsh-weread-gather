export interface OutputWriter {
    write(chunk: string): unknown;
}
export interface OutputOptions {
    json: boolean;
    stdout: OutputWriter;
}
export declare function output<T>(data: T, options: OutputOptions, humanFormat: (value: T) => string): void;
