import parseTorrent from 'parse-torrent';
import torrentStream from 'torrent-stream';
import Logger, { LogLevel } from '../../misc/Logger';
import { Torrent } from './Torrent';

const writeLine = Logger.generateLogger("TorrentService");

const SPEED_LIMIT = 300000;

export class TorrentService {
    private torrents: Map<string, Torrent>;

    constructor() {
        this.torrents = new Map();
    }

    public getTorrents(): Torrent[] {
        return Array.from(this.torrents.values());
    }

    public getTorrent(infoHash: string) {
        return this.torrents.get(infoHash);
    }

    public addTorrent(magnetUrl: string): Promise<Torrent> {
        return new Promise((resolve, reject) => {

            parseTorrent.remote(magnetUrl, (err, parsedTorrent) => {
                if (err || !parsedTorrent) {
                    writeLine("Error adding torrent: " + err, LogLevel.Warning);
                    reject(err);
                    return;
                }
                const { infoHash } = parsedTorrent;
                const alreadyAdded = this.torrents.get(infoHash)
                if (alreadyAdded) {
                    writeLine("Found: " + infoHash);
                    resolve(alreadyAdded);
                } else {
                    const engine = torrentStream(parsedTorrent as any, { downloadLimit: SPEED_LIMIT });
                    engine.on("ready", () => {
                        writeLine("Added " + parsedTorrent.name + " (" + infoHash + ")");
                        const download = new Torrent(engine, parsedTorrent.name);
                        this.torrents.set(infoHash, download);
                        resolve(download);
                    });
                    // handle timeout?
                }
            });
        });
    }
}