import { has, set } from "./flags";
import Stream from "./stream";
import { ImageInfo, Manifest, PhotoInfo, Shapes } from "./types";

const PhotoFlags = {
    None: 0,
    HasGPS: 1 << 0,
    HasRating: 1 << 1,
    HasTimestamp: 1 << 2,
}

export default class Binary extends Stream {
    readManifest(): Manifest {
        const languages: string[] = [];
        const nLanguages = this.readVarInt();
        for (let i = 0; i < nLanguages; ++i) {
            const lang = this.readUtf8();
            languages.push(lang);
        }

        const tags: string[] = [];
        const nTags = this.readVarInt();
        for (let i = 0; i < nTags; ++i) {
            tags.push(this.readUtf8());
        }

        const photos: Record<string, PhotoInfo> = {};
        const nPhotos = this.readVarInt();
        for (let i = 0; i < nPhotos; ++i) {
            const { name, info } = this.readPhoto(tags);
            photos[name] = info;
        }

        return { languages, tags, photos };
    }
    writeManifest(m: Manifest): number {
        this.writeVarInt(m.languages.length);
        m.languages.forEach(l => this.writeUtf8(l));

        this.writeVarInt(m.tags.length);
        m.tags.forEach(t => this.writeUtf8(t));

        const photos = Object.entries(m.photos);
        this.writeVarInt(photos.length);
        photos.forEach(([name, info]) => this.writePhoto(m.tags, name, info));

        return this.offset;
    }
    readTagLoca(): string[] {
        const out: string[] = [];
        const n = this.readVarInt();
        for (let i = 0; i < n; ++i) {
            out.push(this.readUtf8());
        }
        return out;
    }
    writeTagLoca(strings: string[]): number {
        this.writeVarInt(strings.length);
        strings.forEach(s => this.writeUtf8(s));
        return this.offset;
    }

    private readImage(): ImageInfo {
        const width = this.readVarInt();
        const height = this.readVarInt();
        const hash = this.readHexString();
        return { width, height, hash };
    }
    private readPhoto(tags: string[]): { name: string; info: PhotoInfo; } {
        const name = this.readUtf8();

        const flags = this.readVarInt();

        const long = has(flags, PhotoFlags.HasGPS) ? this.readF32() : undefined;
        const lat = has(flags, PhotoFlags.HasGPS) ? this.readF32() : undefined;

        const stars = has(flags, PhotoFlags.HasRating) ? this.readU8() : undefined;

        const ts = has(flags, PhotoFlags.HasTimestamp) ? this.readVarInt() : undefined;

        const nImgTags = this.readVarInt();
        const imgTags: string[] = [];
        for (let i = 0; i < nImgTags; ++i) {
            const idx = this.readVarInt();
            const tag = tags[idx];
            imgTags.push(tag);
        }

        const image = this.readImage();
        const thumb = this.readImage();

        return {
            name,
            info: {
                long,
                lat,
                stars,
                ts,
                tags: imgTags,
                image,
                thumb,
            }
        };
    }
    private writeImage(img: ImageInfo) {
        this.writeVarInt(img.width);
        this.writeVarInt(img.height);
        this.writeHexString(img.hash ?? '');
    }
    private writePhoto(tags: string[], name: string, photo: PhotoInfo) {
        this.writeUtf8(name);

        let flags = PhotoFlags.None;
        if (photo.long !== undefined && photo.lat !== undefined) {
            flags = set(flags, PhotoFlags.HasGPS);
        }
        if (photo.stars !== undefined) {
            flags = set(flags, PhotoFlags.HasRating);
        }
        if (photo.ts !== undefined) {
            flags = set(flags, PhotoFlags.HasTimestamp);
        }
        this.writeVarInt(flags);

        if (has(flags, PhotoFlags.HasGPS)) {
            this.writeF32(photo.long!);
            this.writeF32(photo.lat!);
        }

        if (has(flags, PhotoFlags.HasRating)) {
            this.writeVarInt(photo.stars!);
        }

        if (has(flags, PhotoFlags.HasTimestamp)) {
            this.writeVarInt(photo.ts!);
        }

        this.writeVarInt(photo.tags.length);
        photo.tags.forEach(t => {
            const idx = tags.indexOf(t);
            if (idx < 0) {
                throw `Invalid tag index: ${idx} (${t})`;
            }
            this.writeVarInt(idx);
        });

        this.writeImage(photo.image);
        this.writeImage(photo.thumb);
    }
}
