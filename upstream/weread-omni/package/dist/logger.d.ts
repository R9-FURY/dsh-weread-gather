export type Logger = Partial<Record<"debug" | "info" | "warn" | "error", (message: string) => void>>;
export declare function emitLog(logger: Logger | undefined, level: keyof Logger, message: string): void;
