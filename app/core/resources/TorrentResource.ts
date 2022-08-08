import rangeParser from "range-parser";
import { Application, Request, Response, NextFunction } from "express";
import { constants as HttpConstants } from "http2";
import pump from "pump";

import Logger from "../../misc/Logger";
import { writeLineWithRequest } from "../../misc/Utils";
import { TorrentService } from "../services/TorrentService";

const writeLine = Logger.generateLogger("LightsResource");

export default class TorrentResource {
    constructor(private torrentService: TorrentService) { }

    public initialize(app: Application): void {
        app.get("/", this.getIndex);
        app.get("/stream", this.listStreams);
        app.post("/stream", this.addStream);
        app.get("/stream/:hash", this.getStreamInfo);
        app.get("/stream/:hash/download", this.performStream);
        app.get("/stream/:hash/download/:fileIndex(\\d+)", this.performStream);
    }

    private listStreams = (req: Request, res: Response, next: NextFunction): void => {
        writeLineWithRequest("Requested list devices", req, writeLine);
        const torrents = this.torrentService.getTorrents();
        res.json(torrents.map(torrent => torrent.getStats()));
    }

    private addStream = (req: Request, res: Response, next: NextFunction): void => {
        const { magnetUrl } = req.body;
        writeLineWithRequest("Adding new torrent: " + magnetUrl, req, writeLine);

        if (!magnetUrl) {
            const errorMessage = "Invalid body format";
            writeLine(errorMessage);
            this.sendError(res, errorMessage, HttpConstants.HTTP_STATUS_BAD_REQUEST);
            return;
        }

        this.torrentService.addTorrent(magnetUrl)
            .then(torrent => res.status(HttpConstants.HTTP_STATUS_CREATED).json(torrent.getStats()))
            .catch(err => {
                const errorMessage = "Error creating torrent: " + err;
                writeLine(errorMessage);
                this.sendError(res, errorMessage, HttpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
            });
    }

    private getStreamInfo = (req: Request, res: Response, next: NextFunction): void => {
        const { hash } = req.params;
        writeLineWithRequest("Requested stream info for " + hash, req, writeLine);
        const torrent = this.torrentService.getTorrent(hash);

        if (!torrent) {
            const errorMessage = hash + " is not an active torrent";
            writeLine(errorMessage);
            this.sendError(res, errorMessage, HttpConstants.HTTP_STATUS_NOT_FOUND);
            return;
        }

        res.json(torrent.getStats());
    }

    private getIndex = (req: Request, res: Response, next: NextFunction): void => {
        writeLineWithRequest("Requested index", req, writeLine);
        res.status(HttpConstants.HTTP_STATUS_NO_CONTENT).send();
    }

    private performStream = (req: Request, res: Response, next: NextFunction): void => {
        const { hash, fileIndex } = req.params;
        writeLineWithRequest("Requested stream with hash: " + hash + " and fileIndex: " + (fileIndex || "main"), req, writeLine);

        const torrent = this.torrentService.getTorrent(hash);

        if (!torrent) {
            const errorMessage = hash + " is not an active torrent";
            writeLine(errorMessage);
            this.sendError(res, errorMessage, HttpConstants.HTTP_STATUS_NOT_FOUND);
            return;
        }

        let file = undefined;

        if (fileIndex) {
            file = torrent.getFile(parseInt(fileIndex, 10));
        } else {
            file = torrent.getMainFile();
        }

        if (!file) {
            const errorMessage = "Invalid file index " + fileIndex;
            writeLine(errorMessage);
            this.sendError(res, errorMessage, HttpConstants.HTTP_STATUS_NOT_FOUND);
            return;
        }

        writeLine("Found " + file.name);

        const rangeStr = req.headers.range;
        const range = rangeStr && ((rangeParser(file.length, rangeStr) as any)[0] as rangeParser.Range);
        res.header("Accept-Ranges", "bytes")
        res.header("transferMode.dlna.org", "Streaming")
        res.header("contentFeatures.dlna.org", "DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000")
        res.type(file.name); // Content-Type

        if (!range) {
            res.header("Content-Length", file.length.toString())
            //if (request.method === "HEAD") {
            //    return res.end()
            //}
            const fileStream = file.createReadStream();
            writeLine("Sending full stream");
            pump(fileStream, res);
            return;
        }

        res.status(HttpConstants.HTTP_STATUS_PARTIAL_CONTENT);
        res.header("Content-Length", (range.end - range.start + 1).toString());
        res.header("Content-Range", "bytes " + range.start + "-" + range.end + "/" + file.length);
        writeLine("Sending range " + range.start + "-" + range.end + "/" + file.length);

        //if (request.method === "HEAD")
        //    return response.end()

        pump(file.createReadStream(range), res);
    }

    private sendError(res: Response, errorMessage: string, httpErrorCode: number) {
        res.status(httpErrorCode).json({
            error: {
                errorMessage,
                errorCode: -1
            }
        });
    }
}