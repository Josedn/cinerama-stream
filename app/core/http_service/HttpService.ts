import http from 'http';
import mime from 'mime';
import url from 'url';
import rangeParser from 'range-parser';
import pump from 'pump';
import { TorrentService } from '../torrent_service/TorrentService';

export default class HttpService {

    constructor(private downloadService: TorrentService) {
    }

    private continueWithFileResponse = (pathName: string, request: http.IncomingMessage, response: http.ServerResponse) => {
        const getType = mime.getType.bind(mime);
        console.log("Searching for " + pathName);
        const file = this.downloadService.getFile(pathName);

        if (!file) {
            this.send404Response(response);
            return;
        }

        console.log("Found " + file.name);

        var rangeStr = request.headers.range
        const range = rangeStr && ((rangeParser(file.length, rangeStr) as any)[0] as rangeParser.Range)
        response.setHeader('Accept-Ranges', 'bytes')
        response.setHeader('Content-Type', getType(file.name) || "")
        response.setHeader('transferMode.dlna.org', 'Streaming')
        response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
        if (!range) {
            response.setHeader('Content-Length', file.length)
            if (request.method === 'HEAD')
                return response.end()
            pump(file.createReadStream() as any, response)
            return
        }

        response.statusCode = 206
        response.setHeader('Content-Length', range.end - range.start + 1)
        response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)
        if (request.method === 'HEAD')
            return response.end()
        pump(file.createReadStream(range) as any, response)
    }

    private send404Response = (response: http.ServerResponse) => {
        console.log("Sending 404 response");
        response.statusCode = 404
        response.end();
    }

    private handleBeginRequest = (request: http.IncomingMessage, response: http.ServerResponse) => {
        var u = url.parse(request.url || "")

        // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
        // by responding to the OPTIONS preflight request with the specified
        // origin and requested headers.
        if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
            response.setHeader('Access-Control-Allow-Origin', request.headers?.origin || "*")
            response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            response.setHeader(
                'Access-Control-Allow-Headers',
                request.headers['access-control-request-headers'])
            response.setHeader('Access-Control-Max-Age', '1728000')

            response.end()
            return
        }

        if (request.headers.origin)
            response.setHeader('Access-Control-Allow-Origin', request.headers.origin)

        if (u.pathname === '/favicon.ico' || !u.pathname) {
            this.send404Response(response);
            return
        }

        this.continueWithFileResponse(u.pathname.slice(1), request, response);
    }

    public initialize = () => {
        var server = http.createServer()

        server.listen(8888);

        server.on("listening", () => {
            console.log("Server listening...");
        });

        server.on('request', this.handleBeginRequest)

        server.on('connection', function (socket) {
            socket.setTimeout(36000000)
        })
    }
}