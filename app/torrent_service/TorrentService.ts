import parseTorrent from 'parse-torrent';
import torrentStream from 'torrent-stream';
import { Torrent } from './Torrent';

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
                    console.log('Theres an error: ' + err);
                    reject(err);
                    return;
                }
                const { infoHash } = parsedTorrent;
                const alreadyAdded = this.torrents.get(infoHash)
                if (alreadyAdded) {
                    console.log("Found " + infoHash);
                    resolve(alreadyAdded);
                } else {
                    const engine = torrentStream(parsedTorrent as any, {});
                    engine.on("ready", () => {
                        console.log("Added " + parsedTorrent.name + " (" + infoHash + ")");
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