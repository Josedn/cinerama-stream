const HASH_CHUNK_SIZE = 65536; //64 * 1024

function binl2hex(a: number[]) {
    let b = 255,
        d = '0123456789abcdef',
        e = '',
        c = 7;

    a[1] += a[0] >> 8;
    a[0] = a[0] & b;
    a[2] += a[1] >> 8;
    a[1] = a[1] & b;
    a[3] += a[2] >> 8;
    a[2] = a[2] & b;
    a[4] += a[3] >> 8;
    a[3] = a[3] & b;
    a[5] += a[4] >> 8;
    a[4] = a[4] & b;
    a[6] += a[5] >> 8;
    a[5] = a[5] & b;
    a[7] += a[6] >> 8;
    a[6] = a[6] & b;
    a[7] = a[7] & b;
    for (; c > -1; c--) {
        e += d.charAt(a[c] >> 4 & 15) + d.charAt(a[c] & 15);
    }
    return e;
}

function processChunk(chunk: Buffer, longs: number[]) {
    for (var i = 0; i < chunk.length; i++) {
        longs[(i + 8) % 8] += chunk.readUint8(i);
    }
}

import fs from "fs";
const fileUrl = "/tmp/torrent-stream/3f8f219568b8b229581dddd7bc5a5e889e906a9b/Pulp Fiction (1994) [1080p]/Pulp.Fiction.1994.1080p.BrRip.x264.YIFY.mp4";
fs.readFile(fileUrl, null, (err, data) => {
    if (err) {
        console.log("Error reading file");
        return;
    }
    const longs: number[] = [];
    const firstChunk = data.slice(0, HASH_CHUNK_SIZE);
    const lastChunk = data.slice(data.byteLength - HASH_CHUNK_SIZE, data.byteLength);
    let temp = data.byteLength;
    for (let i = 0; i < 8; i++) {
        longs[i] = temp & 255;
        temp = temp >> 8;
    }
    console.log(firstChunk.length);
    console.log(lastChunk.length);
    console.log(binl2hex(longs));
    processChunk(firstChunk, longs);
    console.log(binl2hex(longs));
    processChunk(lastChunk, longs);

    console.log(binl2hex(longs));
});

