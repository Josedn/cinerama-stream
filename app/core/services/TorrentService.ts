import parseTorrent from 'parse-torrent';
import torrentStream from 'torrent-stream';
import Logger, { LogLevel } from '../../misc/Logger';
import { Torrent } from './Torrent';

const writeLine = Logger.generateLogger("TorrentService");

export class TorrentService {
    private torrents: Map<string, Torrent>;

    constructor(private torrentMaxIdleTimeMs: number, private tempFolderLocation: string, private speedLimitBytesPerSecond: number | undefined) {
        this.torrents = new Map();
    }

    public tick() {
        const torrentsToUnload = this.getTorrents().filter(torrent => torrent.getIdleTime() > this.torrentMaxIdleTimeMs);

        torrentsToUnload.forEach(torrent => {
            this.torrents.delete(torrent.getInfoHash());
            torrent.destroy();
        });
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
                    alreadyAdded.unIdle();
                    resolve(alreadyAdded);
                } else {
                    const engine = torrentStream(parsedTorrent, { downloadLimit: this.speedLimitBytesPerSecond, tmp: this.tempFolderLocation });
                    let verifiedPieces = 0;
                    engine.on('verify', () => {
                        verifiedPieces++;
                    });
                    engine.on("ready", () => {
                        writeLine("Added " + parsedTorrent.name + " (" + infoHash + ")");
                        const download = new Torrent(engine, verifiedPieces, parsedTorrent.name);
                        this.torrents.set(infoHash, download);
                        resolve(download);
                    });
                    // handle timeout?
                }
            });
        });
    }
}