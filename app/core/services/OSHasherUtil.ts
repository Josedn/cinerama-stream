export const HASH_CHUNK_SIZE = 65536; //64 * 1024

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

export function osHash(firstChunk: Buffer, lastChunk: Buffer, size: number) {
    const longs: number[] = [];
    let temp = size;
    for (let i = 0; i < 8; i++) {
        longs[i] = temp & 255;
        temp = temp >> 8;
    }
    processChunk(firstChunk, longs);
    processChunk(lastChunk, longs);

    return binl2hex(longs);
}