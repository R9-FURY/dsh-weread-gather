export function output(data, options, humanFormat) {
    const text = options.json ? (JSON.stringify(data) ?? "null") : humanFormat(data);
    options.stdout.write(`${text.replace(/\n+$/, "")}\n`);
}
//# sourceMappingURL=output.js.map