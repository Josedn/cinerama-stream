import { Readable } from "stream";
import { ReadStreamOptions, TorrentEngine, TorrentFile } from "torrent-stream";
import Logger from "../../misc/Logger";

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
    idleTime: number,
    interested: boolean,
    completed: boolean,
    hotswaps: number,
    verifiedPieces: number,
    invalidPieces: number,
    totalPieces?: number,
    downloadedPercentage: number,
    activeStreams: number,
    files: FileStats[],
}

const writeLine = Logger.generateLogger("Torrent");

export class Torrent {
    private mainFileIndex: number;
    private lastActiveTimestamp: number;
    private invalidPieces: number;
    private hotswaps: number;
    private completed: boolean;
    private activeStreams: Set<Readable>;

    constructor(public engine: TorrentEngine, private verifiedPieces: number, public name?: string) {
        this.lastActiveTimestamp = Date.now();
        this.mainFileIndex = this.findIndex();
        this.invalidPieces = 0;
        this.hotswaps = 0;
        this.completed = false;
        this.activeStreams = new Set();

        engine.on('idle', () => {
            this.completed = true;
        });

        engine.on('verify', () => {
            this.verifiedPieces++;
        });

        engine.on('invalid-piece', () => {
            this.invalidPieces++;
        });

        engine.on('hotswap', () => {
            this.hotswaps++;
        });

        engine.on('uninterested', () => {
            engine.swarm.pause();
        });

        engine.on('interested', () => {
            engine.swarm.resume();
        });

        engine.on('verifying', () => {
            writeLine("Verifying..." + this.verifiedPieces);
        });
    }

    public getIdleTime(): number {
        if (this.getActiveStreams() == 0) {
            return Date.now() - this.lastActiveTimestamp;
        }
        return -1;
    }

    public getInfoHash() {
        return this.engine.infoHash;
    }

    public destroy() {
        this.activeStreams.forEach(stream => {
            stream.destroy();
        });
        this.engine.destroy(() => {
            writeLine("Torrent " + this.name + " destroyed");
        });
    }

    public getFile(index?: number): TorrentFile | undefined {
        return this.engine.files[index || this.mainFileIndex];
    }

    public unIdle() {
        this.lastActiveTimestamp = Date.now();
    }

    public createReadStream(file: TorrentFile, options?: ReadStreamOptions): Readable {
        const stream = file.createReadStream(options);
        stream.on("close", () => {
            this.activeStreams.delete(stream);
            if (this.getActiveStreams() == 0) {
                this.unIdle();
            }
        });
        this.activeStreams.add(stream);
        return stream;
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
            idleTime: this.getIdleTime(),
            interested: this.isInterested(),
            completed: this.completed,
            hotswaps: this.hotswaps,
            verifiedPieces: this.verifiedPieces,
            invalidPieces: this.invalidPieces,
            totalPieces: this.engine.torrent.pieces?.length,
            downloadedPercentage: this.getDownloadedPercentage(),
            activeStreams: this.getActiveStreams(),
            files: this.engine.files.map((file, index) => {
                return {
                    name: file.name,
                    length: file.length,
                    index: index,
                };
            })
        };
    }

    private getDownloadedPercentage() {
        if (this.engine.torrent.pieces) {
            return Math.floor(this.verifiedPieces / this.engine.torrent.pieces.length * 100);
        }
        return 0;
    }

    private isInterested(): boolean {
        return this.engine.amInterested;
    }

    private getActiveStreams(): number {
        return this.activeStreams.size;
    }

    private findIndex() {
        const { files } = this.engine;
        const biggestFile = files.reduce(function (a, b) {
            return a.length > b.length ? a : b
        });
        return files.indexOf(biggestFile);
    }
}