import { Request } from "express";
import { Readable } from "stream";
import { LogLevel } from "./Logger";

export const writeLineWithRequest = (line: string, req: Request, writeLine: (text: string, logLevel?: LogLevel) => void) => {
    const address = req.connection.remoteAddress;
    if (address != null) {
        writeLine(line + " from " + address);
    } else {
        writeLine(line + " with null address", LogLevel.Warning);
    }
};

export const streamToString = (stream: Readable): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => { chunks.push(Buffer.from(chunk)) });
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}