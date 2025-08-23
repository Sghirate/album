import { createHash } from 'crypto';
import { createReadStream } from "fs";
import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { Logger } from "vite";
import { CacheOptions, OutputOptions } from "./options";
import { Photo } from "./photo";
import { Shapes } from '../shared/types';

export interface Cache {
    /** Initialize the Cache. Will:
     * - Create the directory if it doesn't exist.
     * - Populate the cache-dictionary.
     * If any of the above steps fail, this function will return false. Otherwise true.
     * Note: the cache dictionary will only be populated with files that were created with the same processor options.
     */
    initAsync(outputOptions: OutputOptions): Promise<boolean>;
    /** Check if photo is present in the cache dictionary.
     */
    hasAsync(photo: Photo, shape: Shapes): Promise<boolean>;
    /** Attempt to read a cached photo. */
    getAsync(photo: Photo, shape: Shapes): Promise<Buffer | undefined>;
    /** Stored a processed photo in the cache. */
    storeAsync(photo: Photo, shape: Shapes, data: Buffer): Promise<boolean>;
}
export function createCache(logger: Logger, options: CacheOptions): Cache {
    const dir = resolve(options.dir);
    const photos = new Map<string, string>();
    let optionsHash: string | undefined;

    async function populateFilesAsync(dir: string) {
        for (const de of await readdir(dir, { withFileTypes: true })) {
            if (!de.isFile()) {
                continue;
            }
            const idx = de.name.lastIndexOf('_');
            if (idx < 0) {
                continue;
            }
            photos.set(de.name.substring(0, idx), de.name.substring(idx + 1));
        }
    }
    async function populateAsync(): Promise<boolean> {
        if (!optionsHash) {
            return false;
        }
        let success = false;
        for (const de of await readdir(dir, { withFileTypes: true })) {
            if (de.isDirectory()) {
                if (de.name !== optionsHash) {
                    await rm(join(dir, de.name), { recursive: true, force: true });
                } else {
                    await populateFilesAsync(join(dir, de.name));
                    success = true;
                }
            }
        }
        if (!success) {
            await mkdir(join(dir, optionsHash), { recursive: true });
        }
        return success;
    }
    async function hashFile(path: string, algo: string = 'sha1'): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            const hash = createHash(algo);
            const stream = createReadStream(path);
            stream.on('error', err => reject(err));
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }
    function cacheFile(name: string, shape: Shapes, hash: string): string | undefined {
        return optionsHash && join(dir, optionsHash, `${name}_${shape}_${hash}`);
    }

    return {
        async initAsync(outputOptions: OutputOptions) {
            optionsHash = createHash('sha256').update(JSON.stringify(outputOptions)).digest('hex');

            photos.clear();

            if (!optionsHash) {
                logger.warn(`No ProcessorOptions provided. Cache disabled`, { timestamp: true });
                return true;
            }

            try {
                await mkdir(dir, { recursive: true });
            } catch (e) {
                logger.error(`Could not create cache directory`, { timestamp: true });
                return false;
            }

            const start = performance.now();
            const success = await populateAsync();
            const end = performance.now();

            logger.info(`Discovered ${photos.size} cached Photos in ${(end - start).toFixed(3)}ms`, { timestamp: true });

            return success;
        },
        async hasAsync(photo: Photo, shape: Shapes): Promise<boolean> {
            const storedHash = photos.get(photo.name);
            if (storedHash === undefined) {
                return false;
            }
            const curHash = await hashFile(photo.path);
            if (storedHash !== curHash) {
                return false;
            }
            const cachePath = cacheFile(photo.name, shape, storedHash);
            if (cachePath === undefined) {
                return false;
            }
            try {
                await stat(cachePath);
                return true;
            } catch {
                return false;
            }
        },
        async getAsync(photo: Photo, shape: Shapes): Promise<Buffer | undefined> {
            const storedHash = photos.get(photo.name);
            if (storedHash === undefined) {
                return undefined;
            }
            const curHash = await hashFile(photo.path);
            if (storedHash !== curHash) {
                return undefined;
            }
            const cachePath = cacheFile(photo.name, shape, storedHash);
            if (cachePath === undefined) {
                return undefined;
            }
            try {
                return await readFile(cachePath);
            } catch {
                return undefined;
            }
        },
        async storeAsync(photo: Photo, shape: Shapes, data: Buffer): Promise<boolean> {
            const storedHash = photos.get(photo.name);
            const storedCachePath = storedHash && cacheFile(photo.name, shape, storedHash);
            const curHash = await hashFile(photo.path);
            if (curHash === storedHash) {
                // already cached
                return true;
            } else if (storedCachePath !== undefined) {
                try {
                    await unlink(storedCachePath);
                } catch { }
            }
            const cachePath = curHash && cacheFile(photo.name, shape, curHash);
            if (cachePath !== undefined) {
                try {
                    await writeFile(cachePath, data);
                    photos.set(photo.name, curHash!);
                } catch { }
            }
            return false;
        }
    }
}
