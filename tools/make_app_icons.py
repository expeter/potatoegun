"""Draw the local launcher icon using only Python's standard library."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'game' / 'assets' / 'app'

def pixel(x, y):
    color = (41, 36, 57)
    def ellipse(cx, cy, rx, ry):
        return ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1
    # Scarf tails and the pilot potato, inset for rounded launcher masks.
    if 20 < x < 56 and 63 < y < 83 and y < 97-x*.45:
        color = (231, 91, 76)
    if ellipse(51, 48, 22, 29): color = (243, 199, 131)
    if ellipse(47, 45, 17, 23): color = (223, 171, 106)
    for cx, cy in [(43,28),(60,61),(44,63)]:
        if ellipse(cx,cy,1.5,2): color = (178, 126, 83)
    if 29 < x < 74 and 40 < y < 46: color = (70, 55, 71)
    for cx in (40, 61):
        if ellipse(cx,44,11,10): color = (65, 51, 69)
        if ellipse(cx,44,8,7): color = (184, 228, 223)
        if ellipse(cx+2,44,2.5,4): color = (46, 46, 61)
        if ellipse(cx-3,41,2,2): color = (251, 244, 217)
    if ellipse(52,59,6,4) and y > 59: color = (88, 58, 65)
    if ellipse(51,72,19,5): color = (241, 112, 82)
    return color

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data) & 0xffffffff)

def draw(size):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            samples = [pixel((x+dx)*100/size,(y+dy)*100/size) for dx,dy in ((.25,.25),(.75,.25),(.25,.75),(.75,.75))]
            rows.extend(round(sum(p[c] for p in samples)/4) for c in range(3))
    return (b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))
            +chunk(b'IDAT',zlib.compress(bytes(rows),9))+chunk(b'IEND',b''))

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    for size in (180,192,512):
        (ROOT / f'potato-{size}.png').write_bytes(draw(size))
