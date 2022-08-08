import parseTorrent from 'parse-torrent';
import torrentStream from 'torrent-stream';
import Logger, { LogLevel } from '../../misc/Logger';
import { Torrent } from './Torrent';

const writeLine = Logger.generateLogger("TorrentService");

export class TorrentService {
    private torrents: Map<string, Torrent>;

    constructor() {
        this.torrents = new Map();
    }

    public getFile(infoHash: string): TorrentStream.TorrentFile | undefined {
        const download = this.torrents.get(infoHash);
        if (download) {
            return download.getMainFile();
        }
        return undefined;
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
                    writeLine("Found: " + infoHash, LogLevel.Debug);
                    resolve(alreadyAdded);
                } else {
                    const engine = torrentStream(parsedTorrent as any, {});
                    engine.on("ready", () => {
                        writeLine("Added " + parsedTorrent.name + " (" + infoHash + ")", LogLevel.Debug);
                        const download = new Torrent(engine);
                        this.torrents.set(infoHash, download);
                        resolve(download);
                    });
                    // handle timeout?
                }
            });
        });
    }
}