import { Request } from "express";

import Logger from "../../misc/Logger";

const writeLine = Logger.generateLogger("AccountService");

const AUTH_HEADER = "cinerama-api-key";

export enum AccountFlags {
    ADD_STREAM,
    GET_ALL_STREAMS,
    GET_STREAM,
    DOWNLOAD_STREAM,
}

export class AccountService {
    private accountHasFlag(token: string, flag: AccountFlags) {
        return true;
    }

    public requestHasFlag(req: Request, flag: AccountFlags) {
        const authHeader = req.get(AUTH_HEADER);
        if (authHeader) {
            return this.accountHasFlag(authHeader, flag);
        }
        return false;
    }
}