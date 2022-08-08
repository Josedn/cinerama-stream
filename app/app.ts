import HttpService from "./http_service/HttpService";
import { TorrentService } from "./torrent_service/TorrentService";

const callMe = "magnet:?xt=urn:btih:D05E21F7E8282A6F1D960627A244F07393F91C76";
const pulp = "magnet:?xt=urn:btih:3F8F219568B8B229581DDDD7BC5A5E889E906A9B&dn=Pulp+Fiction+%281994%29+%5B1080p%5D+%5BYTS.LT%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337";
const perks = "magnet:?xt=urn:btih:6E4836EB717303628B4C90D5EA2DE0A0ACBAED0C&dn=The+Perks+of+Being+a+Wallflower+%282012%29+%5B1080p%5D+%5BYTS.MX%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337";

const downloadService = new TorrentService();

const run = async () => {
    try {
        await downloadService.addTorrent(callMe);
        await downloadService.addTorrent(pulp);
        await downloadService.addTorrent(perks);
        console.log("ok... starting server");

        const httpService = new HttpService(downloadService);

        httpService.initialize();
    } catch (error) {
        console.log("Error adding torrent: " + error);
    }
};

run();
