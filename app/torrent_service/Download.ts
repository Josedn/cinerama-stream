export default class Download {
    private mainFileIndex: number;

    private findIndex() {
        const { files } = this.engine;
        const biggestFile = files.reduce(function (a, b) {
            return a.length > b.length ? a : b
        });
        biggestFile.select();
        return files.indexOf(biggestFile);
    }

    public getMainFile() {
        return this.engine.files[this.mainFileIndex];
    }

    constructor(public engine: TorrentStream.TorrentEngine) {
        this.mainFileIndex = this.findIndex();

        engine.on('uninterested', function () {
            engine.swarm.pause()
        });

        engine.on('interested', function () {
            engine.swarm.resume()
        });
    }


}