import rangeParser from "range-parser";
import { Application, Request, Response, NextFunction } from "express";
import { constants as HttpConstants } from "http2";
import pump from "pump";

import Logger from "../../misc/Logger";
import { streamToString, writeLineWithRequest } from "../../misc/Utils";
import { TorrentService } from "../services/TorrentService";
import { AccountFlags, AccountService } from "../services/AccountService";
import { CineError } from "cinerama-common/lib/protocol";
import { HASH_CHUNK_SIZE, osHash } from "../services/OSHasherUtil";

const writeLine = Logger.generateLogger("LightsResource");

export default class TorrentResource {
    constructor(private torrentService: TorrentService, private accountService: AccountService) { }

    public initialize(app: Application): void {
        app.get("/stream", this.listStreams);
        app.post("/stream", this.addStream);
        app.get("/stream/:hash", this.getStreamInfo);
        app.get("/stream/:hash/hash", this.getHash);
        app.get("/stream/:hash/download", this.performStream);
        app.get("/stream/:hash/download/:fileIndex(\\d+)", this.performStream);
        app.get("*", this.get404);
    }

    private listStreams = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.GET_ALL_STREAMS)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        writeLineWithRequest("Requested list devices", req, writeLine);
        const torrents = this.torrentService.getTorrents();
        res.json(torrents.map(torrent => torrent.getStats()));
    }

    private addStream = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.ADD_STREAM)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        const { magnetUrl } = req.body;
        writeLineWithRequest("Adding new torrent: " + magnetUrl, req, writeLine);

        if (!magnetUrl) {
            this.sendError(res, CineError.INVALID_BODY_FORMAT);
            return;
        }

        this.torrentService.addTorrent(magnetUrl)
            .then(torrent => res.status(HttpConstants.HTTP_STATUS_CREATED).json(torrent.getStats()))
            .catch(err => this.sendError(res, CineError.INVALID_TORRENT, err));
    }

    private getStreamInfo = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.GET_STREAM)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        const { hash } = req.params;
        writeLineWithRequest("Requested stream info for " + hash, req, writeLine);
        const torrent = this.torrentService.getTorrent(hash);

        if (!torrent) {
            this.sendError(res, CineError.NOT_FOUND_OR_NOT_ACTIVE_TORRENT);
            return;
        }

        res.json(torrent.getStats());
    }

    private get404 = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.GET_STREAM)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        writeLineWithRequest("Requested 404", req, writeLine);
        this.sendError(res, CineError.PAGE_NOT_FOUND);
    }

    private getHash = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.DOWNLOAD_STREAM)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        const { hash } = req.params;
        writeLineWithRequest("Requested osHash with hash: " + hash, req, writeLine);

        const torrent = this.torrentService.getTorrent(hash);

        if (!torrent) {
            this.sendError(res, CineError.NOT_FOUND_OR_NOT_ACTIVE_TORRENT);
            return;
        }

        const file = torrent.getFile();
        if (!file) {
            this.sendError(res, CineError.INVALID_FILE_INDEX);
            return;
        }

        const size = file.length;
        const firstChunk = torrent.createReadStream(file, { start: 0, end: HASH_CHUNK_SIZE - 1 });
        const lastChunk = torrent.createReadStream(file, { start: size - HASH_CHUNK_SIZE, end: size - 1 });
        Promise.all([streamToString(firstChunk), streamToString(lastChunk)])
            .then(buffers => {
                const [first, second] = buffers;
                res.json(osHash(first, second, size));
            }).catch(err => {
                this.sendError(res, CineError.INVALID_TORRENT, err);
            }).finally(() => {
                firstChunk.destroy();
                lastChunk.destroy();
            });
    }

    private performStream = (req: Request, res: Response, next: NextFunction): void => {
        if (!this.accountService.requestHasFlag(req, AccountFlags.DOWNLOAD_STREAM)) {
            this.sendError(res, CineError.NOT_AUTHORIZED);
            return;
        }
        const { hash, fileIndex } = req.params;
        writeLineWithRequest("Requested stream with hash: " + hash + " and fileIndex: " + (fileIndex || "main"), req, writeLine);

        const torrent = this.torrentService.getTorrent(hash);

        if (!torrent) {
            this.sendError(res, CineError.NOT_FOUND_OR_NOT_ACTIVE_TORRENT);
            return;
        }

        let file = undefined;

        if (fileIndex) {
            file = torrent.getFile(parseInt(fileIndex));
        } else {
            file = torrent.getFile();
        }

        if (!file) {
            this.sendError(res, CineError.INVALID_FILE_INDEX);
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
            const fileStream = torrent.createReadStream(file);
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
        pump(torrent.createReadStream(file, range), res);
    }

    private sendError(res: Response, cineError: CineError, additional?: string) {
        res.status(cineError.httpStatusCode).json({
            error: {
                errorMessage: cineError.errorMessage,
                errorCode: cineError.errorCode,
                additional: additional || null,
            }
        });
    }
}