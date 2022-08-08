export interface FileStats {
    name: string,
    length: number,
    index: number,
}

export interface SwarmStats {
    name: string | null,
    infoHash: string,
    totalLength: number,
    downloaded: number,
    uploaded: number,
    downloadSpeed: number,
    uploadSpeed: number,
    totalPeers: number,
    activePeers: number,
    files: FileStats[],
}

export class Torrent {
    private mainFileIndex: number;

    constructor(public engine: TorrentStream.TorrentEngine, public name?: string) {
        this.mainFileIndex = this.findIndex();

        engine.on('uninterested', function () {
            engine.swarm.pause()
        });

        engine.on('interested', function () {
            engine.swarm.resume()
        });
    }

    private findIndex() {
        const { files } = this.engine;
        const biggestFile = files.reduce(function (a, b) {
            return a.length > b.length ? a : b
        });
        return files.indexOf(biggestFile);
    }

    public getMainFile() {
        return this.engine.files[this.mainFileIndex];
    }

    public getFile(index: number): TorrentStream.TorrentFile | undefined {
        return this.engine.files[index];
    }

    public getStats(): SwarmStats {
        const totalPeers = this.engine.swarm.wires;
        const activePeers = totalPeers.filter(function (wire) {
            return (!wire.peerChoking);
        })

        const totalLength = this.engine.files.reduce(function (prevFileLength, currFile) {
            return prevFileLength + currFile.length;
        }, 0);

        return {
            name: this.name || null,
            infoHash: this.engine.infoHash,
            totalLength: totalLength,
            downloaded: this.engine.swarm.downloaded,
            uploaded: this.engine.swarm.uploaded,
            downloadSpeed: parseInt(this.engine.swarm.downloadSpeed(), 10),
            uploadSpeed: parseInt(this.engine.swarm.uploadSpeed(), 10),
            totalPeers: totalPeers.length,
            activePeers: activePeers.length,
            files: this.engine.files.map((file, index) => {
                return {
                    name: file.name,
                    length: file.length,
                    index: index,
                };
            })
        };
    }

}