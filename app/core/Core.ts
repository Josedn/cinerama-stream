import Express from "express";
import bodyParser from "body-parser";
import compress from "compression";
import responseTime from "response-time";
import ConfigManager from "../misc/ConfigManager";
import Logger, { LogLevel } from "../misc/Logger";
import { TorrentService } from "./torrent_service/TorrentService";
import TorrentResource from "./TorrentResource";

const writeLine = Logger.generateLogger("Core");

const pulpFiction = "magnet:?xt=urn:btih:3F8F219568B8B229581DDDD7BC5A5E889E906A9B&dn=Pulp+Fiction+%281994%29+%5B1080p%5D+%5BYTS.LT%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337";
const perks = "magnet:?xt=urn:btih:6E4836EB717303628B4C90D5EA2DE0A0ACBAED0C&dn=The+Perks+of+Being+a+Wallflower+%282012%29+%5B1080p%5D+%5BYTS.MX%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337";

export default class Core {
    private app: Express.Application;

    constructor(private configManager: ConfigManager) {
        this.app = Express();
    }

    public async initialize(): Promise<void> {
        const torrentService = new TorrentService();
        const torrentResource = new TorrentResource(torrentService);

        //await torrentService.addTorrent(pulpFiction);
        //await torrentService.addTorrent(perks);
        await this.initializeExpress(this.configManager.getApiPort());
        torrentResource.initialize(this.app);
    }

    private initializeExpress(apiPort: number): Promise<void> {
        // Enable parsing JSON bodies.
        this.app.use(bodyParser.json());

        // Enables compression of response bodies.
        this.app.use(compress({
            threshold: 1400,
            level: 4,
            memLevel: 3
        }));

        // Enable response time tracking for HTTP request.
        this.app.use(responseTime());

        // Enable cors
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token");
            next();
        });

        return new Promise((resolve, reject) => {
            this.app.listen(apiPort)
                .on("error", (err) => {
                    reject(err);
                })
                .on("listening", () => {
                    writeLine("Server listening on " + apiPort + "...", LogLevel.Verbose);
                    resolve();
                }).on("close", () => {
                    writeLine("closed", LogLevel.Warning);
                });
        });
    }
}