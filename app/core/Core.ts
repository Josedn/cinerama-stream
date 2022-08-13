import Express from "express";
import bodyParser from "body-parser";
import compress from "compression";
import responseTime from "response-time";
import ConfigManager from "../misc/ConfigManager";
import Logger, { LogLevel } from "../misc/Logger";
import { TorrentService } from "./services/TorrentService";
import TorrentResource from "./resources/TorrentResource";

const writeLine = Logger.generateLogger("Core");
const DELTA_TIME_MS = 5000;

export default class Core {
    private app: Express.Application;
    private torrentService: TorrentService;
    private torrentResource: TorrentResource;

    constructor(private configManager: ConfigManager) {
        this.app = Express();
        this.torrentService = new TorrentService();
        this.torrentResource = new TorrentResource(this.torrentService);
    }

    private ticker = () => {
        this.torrentService.tick();
        setTimeout(this.ticker, DELTA_TIME_MS);
    }

    public async initialize(): Promise<void> {
        await this.initializeExpress(this.configManager.getApiPort());
        this.torrentResource.initialize(this.app);
        setTimeout(this.ticker, DELTA_TIME_MS);
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