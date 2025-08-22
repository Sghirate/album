import exifr from "exifr";
import { readdir, stat } from "fs/promises";
import moment from "moment";
import { join, parse, resolve } from "path";
import { FSWatcher, Logger, ViteDevServer } from "vite";
import { Filter } from "./filter";
import { getSizeAsync } from "./image";
import { PhotoMetaData } from "./metadata";
import { InputOptions, OutputOptions } from "./options";
import { Photo } from "./photo";

export interface Input {
    initAsync(filter?: Filter, server?: ViteDevServer): Promise<boolean>;
    shutdown(): void;
    get(name: string): Photo|undefined;
    all(): Generator<Photo>;
}
export function createInput(logger: Logger, options: InputOptions, output: OutputOptions): Input {
    type Entry = {
        photo: Photo;
        isStale: boolean;
    }
    const dir = resolve(options.dir);
    const photos = new Map<string, Entry>();
    const names = new Map<string, string>();
    let watcher: FSWatcher | undefined;
    let curFilter: Filter | undefined;

    function createPhoto(name: string, path: string, meta: PhotoMetaData): Photo {
        return {
            name, path, meta,
            size: { width: Number.NaN, height: Number.NaN },
            image: { width: Number.NaN, height: Number.NaN },
            thumb: { width: Number.NaN, height: Number.NaN },
        }
    }
    async function determineSizeAsync(photo: Photo) {
        photo.size = await getSizeAsync(photo.path);
        for (const shape of ['image', 'thumb'] as const) {
            const factor = Math.min(
                output[shape].maxPixelDimension / photo.size.width,
                output[shape].maxPixelDimension / photo.size.height,
            );
            photo[shape].width = factor > 1 ? photo.size.width : Math.round(photo.size.width * factor);
            photo[shape].height = factor > 1 ? photo.size.height : Math.round(photo.size.height * factor);
        }
    }

    async function tryParse(path: string): Promise<boolean> {
        try {
            const meta = await exifr.parse(path, true) as PhotoMetaData;
            const name = parse(path).name;
            const photo = createPhoto(name, path, meta);
            if (curFilter && !curFilter.photo(photo)) {
                if (names.get(photo.name) === path) {
                    names.delete(photo.name);
                }
                if (photos.delete(path)) {
                    // TODO: report change
                }
                return false;
            }
            if (meta.DateTimeOriginal) {
                photo.name = moment(meta.DateTimeOriginal).format('YYYYMMDD_HHmmss_ZZ')
            }
            await determineSizeAsync(photo);
            photos.set(path, { photo, isStale: false });
            names.set(photo.name, path);
            return true;
        } catch (e) {
            console.error(e);
            const existing = photos.get(path);
            if (existing) {
                existing.isStale = true;
            }
            logger.warn(`Could not parse ${path}`, { timestamp: true });
            return false;
        }
    }
    async function register(path: string): Promise<boolean> {
        return tryParse(path);
    }
    async function unregister(path: string): Promise<boolean> {
        const existing = photos.get(path);
        if (!existing) {
            return false;
        }
        if (names.get(existing.photo.name) === path) {
            names.delete(existing.photo.name);
        }
        photos.delete(path);
        return true;
    }
    async function populateAsync(dir: string) {
        for (const de of await readdir(dir, { withFileTypes: true })) {
            if (de.isDirectory()) {
                await populateAsync(join(dir, de.name));
            } else if (de.isFile()) {
                const path = join(dir, de.name);
                if (curFilter && !curFilter.path(path)) {
                    continue;
                }
                await register(path);
            }
        }
    }
    function onFileChange(eventName: string, path: string) {
        if (!path.startsWith(dir)) {
            return;
        }
        switch (eventName) {
            case 'add': {
                tryParse(path);
            } break;
            case 'change': {
                tryParse(path);
            } break;
            case 'unlink': {
                unregister(path);
            } break;
            // TODO: maybe handle unlinkDir
        }
    }

    return {
        async initAsync(filter?: Filter, server?: ViteDevServer) {
            curFilter = filter;
            try {
                const s = await stat(dir);
                if (!s.isDirectory()) {
                    logger.error(`Gallery dir invalid: ${dir}`, { timestamp: true });
                    return false;
                }
            } catch (e) {
                logger.error(`Gallery dir invalid: ${dir}`, { timestamp: true });
                return false;
            }

            watcher = server?.watcher;

            const start = performance.now();
            await populateAsync(dir);
            const end = performance.now();
            logger.info(`Discovered ${photos.size} Photos in ${(end - start).toFixed(3)}ms`, { timestamp: true });

            if (watcher) {
                watcher.add(dir);
                watcher.on('all', onFileChange);
            }

            return true;
        },
        shutdown() {
            if (watcher) {
                watcher.off('all', onFileChange);
            }
        },
        get(name: string): Photo|undefined {
            const path = names.get(name);
            const photo = path ? photos.get(path) : undefined;
            return (photo && !photo.isStale) ? photo.photo : undefined;
        },
        *all() {
            for (const photo of photos.values()) {
                if (photo.isStale) {
                    // Ignore stale / deleted photos
                    continue;
                }
                yield photo.photo;
            }
        }
    }
}
