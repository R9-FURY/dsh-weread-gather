import qrcode from "qrcode-terminal";
export function printQr(url) {
    return new Promise((resolve) => {
        qrcode.generate(url, { small: true }, (output) => {
            process.stderr.write(output);
            resolve();
        });
    });
}
//# sourceMappingURL=qr-terminal.js.map