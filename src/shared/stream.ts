const MulHi = Math.pow(2, 28);
const MaskHi = 0x1FFFFFF;
const MaskContinue = 0x80;
const MaskValue = 0x7f;

export default class Stream {
    #view: DataView;
    #offset: number;

    get offset(): number { return this.#offset; }

    constructor(buf: ArrayBufferLike, offset: number = 0) {
        this.#view = new DataView(buf, offset);
        this.#offset = offset;
    }

    readU8(): number {
        this.#offset += 1;
        return this.#view.getUint8(this.#offset - 1);
    }
    writeU8(value: number): void {
        this.#view.setUint8(this.#offset, value);
        this.#offset += 1;
    }
    readF32(): number {
        this.#offset += 4;
        return this.#view.getFloat32(this.#offset - 4);
    }
    writeF32(value: number) {
        this.#view.setFloat32(this.#offset, value);
        this.#offset += 4;
    }
    readVarInt(): number {
        let lo = 0;
        let hi = 0;
        for (let i = 0; i < 4; ++i) {
            const c = this.readU8();
            lo |= ((c & MaskValue) << (i * 7)) >>> 0;
            if ((c & MaskContinue) === 0) {
                return lo;
            }
        }
        for (let i = 0; i < 4; ++i) {
            const c = this.readU8();
            hi |= ((c & MaskValue) << (i * 7)) >>> 0;
            if ((c & MaskContinue) === 0) {
                break;
            }
        }
        return MulHi * (MaskHi & hi) + (lo >>> 0);
    }
    writeVarInt(value: number) {
        while (value >= MaskContinue) {
            const bits = value & MaskValue;
            this.writeU8(bits | MaskContinue);
            value = (value - bits) / MaskContinue;
        }
        this.writeU8(value & MaskValue);
    }
    readUtf8(): string {
        let len = this.readVarInt();
        const arr = [];
        while (len > 0) {
            const byte1 = this.readU8();
            if (byte1 <= 127) {
                arr.push(byte1);
            } else if (byte1 >= 128 && byte1 <= 223) {
                const c = ((byte1 & 0x1f) << 6)
                    | (this.readU8() & 0x3f);
                arr.push(c);
            } else if (byte1 >= 224 && byte1 <= 239) {
                const c = ((byte1 & 0x1f) << 12)
                    | ((this.readU8() & 0x3f) << 6)
                    | (this.readU8() & 0x3f);
                arr.push(c);
            } else {
                let codePoint = ((byte1 & 0x07) << 18)
                    | ((this.readU8() & 0x3F) << 12)
                    | ((this.readU8() & 0x3F) << 6)
                    | (this.readU8() & 0x3F);
                codePoint -= 0x10000;
                const hi = (codePoint >> 10) + 0xD800;
                const lo = (codePoint % 0x400) + 0xDC00;
                arr.push(hi, lo);
            }
            --len;
        }
        return String.fromCharCode(...arr);
    }
    writeUtf8(value: string) {
        this.writeVarInt(value.length);
        for (let i = 0; i < value.length; ++i) {
            const c = value.charCodeAt(i);
            if (c < 0x80) {
                this.writeU8(c & 0x7f);
            } else if (c < 0x800) {
                this.writeU8(0xc0 | (c >> 6));
                this.writeU8(0x80 | (c & 0x3f));
            } else if (c < 0xd800 || c > 0xe000) {
                this.writeU8(0xe0 | (c >> 12));
                this.writeU8(0x80 | ((c >> 6) & 0x3f));
                this.writeU8(0x80 | (c & 0x3f));
            } else {
                ++i;
                const c2 = 0x10000 + (((c & 0x3ff) << 10)
                    | (value.charCodeAt(i) & 0x3ff));
                this.writeU8(0xf0 | (c2 >> 18));
                this.writeU8(0x80 | ((c2 >> 12) & 0x3f));
                this.writeU8(0x80 | ((c2 >> 6) & 0x3f));
                this.writeU8(0x80 | (c2 & 0x3f));
            }
        }
    }
    readHexString(): string {
        let hex = [];
        const n = this.readU8();
        for (let i = 0; i < n; i++) {
            const byte = this.readU8();
            let current = byte < 0 ? byte + 256 : byte;
            hex.push((current >>> 4).toString(16));
            hex.push((current & 0xF).toString(16));
        }
        return hex.join("");
    }
    writeHexString(value: string) {
        const bytes: number[] = [];
        for (let i = 0; i < value.length - 1; i += 2) {
            bytes.push(parseInt(value.substring(i, i + 2), 16))
        }
        this.writeVarInt(bytes.length);
        bytes.forEach(b => this.writeU8(b));
    }
}
