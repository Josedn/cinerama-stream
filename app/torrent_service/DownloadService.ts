import parseTorrent from 'parse-torrent';
import torrentStream from 'torrent-stream';
import Download from './Download';

export default class DownloadService {
    private downloads: Map<string, Download>;

    constructor() {
        this.downloads = new Map();
    }

    public getFile(infoHash: string): TorrentStream.TorrentFile | undefined {
        const download = this.downloads.get(infoHash);
        if (download) {
            return download.getMainFile();
        }
        return undefined;
    }

    public addTorrent(magnetUrl: string): Promise<Download> {
        return new Promise((resolve, reject) => {

            parseTorrent.remote(magnetUrl, (err, parsedTorrent) => {
                if (err || !parsedTorrent) {
                    console.log('Theres an error: ' + err);
                    reject(err);
                    return;
                }
                const { infoHash } = parsedTorrent;
                const alreadyAdded = this.downloads.get(infoHash)
                if (alreadyAdded) {
                    console.log("Found " + infoHash);
                    resolve(alreadyAdded);
                } else {
                    const engine = torrentStream(parsedTorrent as any, {});
                    engine.on("ready", () => {
                        console.log("Added " + parsedTorrent.name + " (" + infoHash + ")");
                        const download = new Download(engine);
                        this.downloads.set(infoHash, download);
                        resolve(download);
                    });
                    // handle timeout?
                }
            });
        });
    }
}