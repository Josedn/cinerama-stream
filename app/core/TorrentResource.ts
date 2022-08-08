import Logger from "../misc/Logger";
import { writeLineWithRequest } from "../misc/Utils";
import { Application, Request, Response, NextFunction } from "express";
import { constants as HttpConstants } from "http2";
import { TorrentService } from "./torrent_service/TorrentService";

const writeLine = Logger.generateLogger("LightsResource");

export default class TorrentResource {
    constructor(private torrentService: TorrentService) { }

    public initialize(app: Application): void {
        app.get("/", this.getIndex);

    }

    private getIndex = (req: Request, res: Response, next: NextFunction): void => {
        writeLineWithRequest("Requested index", req, writeLine);
        res.status(HttpConstants.HTTP_STATUS_NO_CONTENT).send();
    }
}