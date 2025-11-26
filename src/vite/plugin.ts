import { readFile } from 'fs/promises';
import { dataToEsm } from '@rollup/pluginutils'
import { basename, join, resolve } from 'path';
import { PluginContext } from 'rollup';
import { Connect, createLogger, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { ImageInfo, Manifest, PhotoInfo, Shapes, TagInfo } from '../shared/types';
import { createCache } from './cache';
import { createFilter } from './filter';
import { convertAsync } from './image';
import { createInput } from './input';
import { makeContentHash } from './makeContentHash';
import { PluginOptions } from './options';
import { Photo } from './photo';
import { IncomingMessage, ServerResponse } from 'http';
import Binary from '../shared/binary';
export {
    hasAnySubject, hasExtension, hasGPSTag, hasImageExtension,
    hasMinimumRating, invertFilter
} from './filter';

function tryWrite(fn: (buf: ArrayBufferLike) => number): Uint8Array {
    const MaxSize = 128 * 1024 * 1024;
    let buf = new ArrayBuffer(1024);
    function write(): number {
        try {
            return fn(buf);
        } catch (e) {
            if (e instanceof RangeError) {
                const newLen = buf.byteLength * 2;
                if (newLen > MaxSize) {
                    throw RangeError(`New buffer size (${newLen}) exceeds maximum allowed buffer size (${MaxSize})`);
                }
                buf = new ArrayBuffer(newLen);
                return write();
            }
        }
    }
    const len = write();
    return new Uint8Array(buf, 0, len);
}

/** Vite plugin instance. */
export default function gallery(options: PluginOptions): Plugin {
    const logger = createLogger(options.logLevel, {
        prefix: '[gallery]',
    });
    const idPrefix = '/@gallery/';
    const idManifest = `${idPrefix}manifest`
    const idImagePrefix = `${idPrefix}image/`
    const idThumbPrefix = `${idPrefix}thumb/`
    const tagLocaFile = options.input.tagLoca && resolve(options.input.tagLoca);
    const input = createInput(logger, options.input, options.output);
    const filter = options.filter && createFilter(options.filter);
    const cache = options.cache && createCache(logger, options.cache);
    // const select = config.selector && createSelector(loger, config.selector);
    // const process = config.processor && createProcessor(logger, config.processor);
    const tagLoca: TagInfo[] = [];
    const languages = new Set<string>();

    let manifestName: string | undefined = undefined;
    let pluginContext: PluginContext;
    let viteConfig: ResolvedConfig;
    let viteServer: ViteDevServer;

    const virtualModuleId = 'virtual:gallery:urls'
    const resolvedVirtualModuleId = '\0' + virtualModuleId;

    function generateUrls() {
        const base = manifestName
            ? manifestName.substring(0, manifestName.lastIndexOf('.'))
            : undefined;
        const resolveSchema = (shape: Shapes) => {
            if (base) {
                const file = options.output[shape].schema
                    .replace('#EXT#', `.${options.output[shape].format.type}`);
                const full = join(viteConfig.build.assetsDir, file);
                return full;
            } else {
                return `${idPrefix}${shape}/#NAME#`;
            }
        }
        const img = {
            image: resolveSchema('image'),
            thumb: resolveSchema('thumb'),
        };
        const locaName = (lang: string) => base
            ? `${base}_${lang}`
            : `${idManifest}?ts=${new Date().getTime()}&lang=${lang}`;
        const json = manifestName ?? `${idManifest}?ts=${new Date().getTime()}`;
        const bin = base ?? `${idManifest}?ts=${new Date().getTime()}&bin`;
        const tagLoca = [...languages].reduce((r, l) => {
            r[l] = locaName(l);
            return r;
        }, {} as { [loca: string]: string });

        return { img, json, bin, tagLoca };
    }

    function generateManifest(): Manifest {
        const tags = tagLoca.map(t => t.tag);

        // fallback manifest
        let maxStars = -1;
        const tagSet = new Set<string>();
        const photos: Record<string, PhotoInfo> = [...input.all()].reduce((r, p) => {
            if (p.image.url !== undefined && p.thumb.url !== undefined) {
                (typeof p.meta.subject === 'string' ? [p.meta.subject] : (p.meta.subject ?? []))
                    .forEach(t => tagSet.add(t));
                const info: PhotoInfo = {
                    long: p.meta.longitude,
                    lat: p.meta.latitude,
                    stars: p.meta.Rating,
                    tags: typeof p.meta.subject === 'string' ? [p.meta.subject] : (p.meta.subject ?? []),
                    ts: p.meta.DateTimeOriginal?.getTime(),
                    image: p.image,
                    thumb: p.thumb,
                }
                if (info.stars !== undefined) {
                    maxStars = Math.max(maxStars, info.stars);
                }

                for (const tag of info.tags) {
                    const idx = tags.indexOf(tag);
                    if (idx < 0) {
                        tags.push(tag);
                    }
                }

                r[p.name] = info;
            }
            return r;
        }, {} as Record<string, any>);
        if (maxStars >= 0) {
            tagSet.add('top-rated');
            for (const name in photos) {
                const info = photos[name];
                if (info.stars === maxStars) {
                    info.tags.push('top-rated');
                }
            }
        }
        return {
            tags,
            photos,
        } as Manifest;
    }
    function getOutputFileName(photo: Photo, shape: Shapes): string {
        const s = options.output[shape];
        return s.schema.replace('#NAME#', photo.name)
            .replace('#EXT#', `.${s.format.type}`)
            .replace('#HASH#', photo[shape].hash ?? '');
    }
    async function loadTagLocaAsync() {
        tagLoca.length = 0;
        if (!tagLocaFile) {
            return;
        }
        try {
            const txt = await readFile(tagLocaFile, { encoding: 'utf8' });
            const json = JSON.parse(txt) as Record<string, Record<string, string>>;
            for (const tag in json) {
                const loca = json[tag];
                let out = tagLoca.find(t => t.tag === tag);
                if (!out) {
                    out = { tag };
                    tagLoca.push(out);
                }
                Object.assign(out, loca);
                for (const lang in loca) {
                    languages.add(lang);
                }
            }
        } catch (e) {
            logger.error(`Could not read tags`, {
                timestamp: true,
                error: (e instanceof Error) ? e : undefined,
            });
        }
    }
    async function emitPhotoAsync(photo: Photo, shape: Shapes): Promise<void> {
        const buf = await convertAsync(photo, photo[shape], options.output[shape]);
        const contentHash = makeContentHash(buf, 16);
        photo[shape].hash = contentHash;
        const fileName = getOutputFileName(photo, shape);
        photo[shape].url = join(viteConfig.build.assetsDir, fileName);
        pluginContext.emitFile({
            type: 'asset',
            fileName: photo[shape].url,
            originalFileName: photo.path,
            needsCodeReference: false,
            source: new Uint8Array(buf),
        });
    }
    async function tryServeImageAsync(res: ServerResponse<IncomingMessage>, name: string, shape: Shapes) {
        try {
            const photo = input.get(name);
            if (!photo) {
                res.statusCode = 404;
                return res.end('Image Not Found');
            }
            const cached = await cache?.getAsync(photo, shape);
            if (cached) {
                res.statusCode = 200;
                return res.end(cached);
            }
            const buf = await convertAsync(photo, photo[shape], options.output[shape]);
            if (!buf) {
                res.statusCode = 500;
                return res.end('Conversion Failed');
            }
            await cache?.storeAsync(photo, shape, buf);
            res.statusCode = 200;
            return res.end(buf);
        } catch (e) {
            console.error(e);
            res.statusCode = 500;
            return res.end(`Unknown Error`);
        }
    }
    function photoRoute(shape: Shapes): Connect.HandleFunction {
        return async (req: Connect.IncomingMessage, res: ServerResponse<IncomingMessage>) => {
            const url = req.url;
            if (url === undefined || url.length <= 0) {
                res.statusCode = 400;
                return res.end('No Image');
            }
            let start = 0;
            while (start < url.length && url[start] === '/') {
                ++start;
            }
            const name = url.substring(start);
            return tryServeImageAsync(res, name, shape);
        }
    }

    return {
        name: 'vite-plugin-gallery',
        enforce: 'pre',
        configResolved(config) {
            viteConfig = config;
            manifestName = config.mode !== 'test' && config.command === 'build'
                ? `${JSON.parse(viteConfig?.define?.BUILD_TIMESTAMP)}.json`
                : undefined;
        },
        configureServer(server: ViteDevServer) {
            viteServer = server;
            server.middlewares.use(idManifest, (req, res) => {
                const params = new URL(req.url.replace(/#/g, '%23'), 'file://').searchParams;
                // Ensure all photos have urls set
                for (const photo of input.all()) {
                    photo.image.url = `${idImagePrefix}${photo.name}`
                    photo.thumb.url = `${idThumbPrefix}${photo.name}`
                }
                if (params.has('bin')) {
                    const manifest = generateManifest();
                    const bytes = tryWrite(buf => new Binary(buf).writeManifest(manifest, [...languages]));
                    res.statusCode = 200;
                    return res.end(bytes);
                } else if (params.has('lang')) {
                    const lang = params.get('lang');
                    const strings = tagLoca.map(t => t[lang] ?? '');
                    const bytes = tryWrite(buf => new Binary(buf).writeTagLoca(strings));
                    res.statusCode = 200;
                    return res.end(bytes);
                } else {
                    // generate and serve manifest
                    const json = generateManifest();
                    res.statusCode = 200;
                    return res.end(JSON.stringify(json));
                }
            });
            viteServer.middlewares.use(idImagePrefix, photoRoute('image'));
            viteServer.middlewares.use(idThumbPrefix, photoRoute('thumb'));
        },
        resolveId(source/*, importer, options*/) {
            if (source === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                return dataToEsm(generateUrls());
            }
        },
        async buildStart() {
            pluginContext = this;
            let success = true;
            await loadTagLocaAsync();
            if (!(await input.initAsync(filter, viteServer))) {
                success = false;
                logger.error('Could not initialize gallery registry', { timestamp: true });
            }
            if (cache && !(await cache.initAsync(options.output))) {
                success = false;
                logger.error('Could not initialize gallery cache', { timestamp: true });
            }
            if (!success) {
                throw `Gallery not initialized!`;
            }
        },
        async generateBundle() {
            const emitPromises: Promise<void>[] = [];
            for (const photo of input.all()) {
                for (const shape of ['image', 'thumb'] as const) {
                    emitPromises.push(emitPhotoAsync(photo, shape));
                }
            }
            await Promise.all(emitPromises);
            const manifest = await generateManifest();
            this.emitFile({
                fileName: manifestName,
                type: 'asset',
                source: JSON.stringify(manifest),
            });

            const binaryManifestName = manifestName.substring(0, manifestName.lastIndexOf('.'));
            const langs = new Set<string>();
            this.emitFile({
                fileName: binaryManifestName,
                type: 'asset',
                source: tryWrite(buf => new Binary(buf).writeManifest(manifest, [...languages])),
            });
            languages.forEach(l => {
                const strings = tagLoca.map(t => t[l] ?? '');
                this.emitFile({
                    fileName: `${binaryManifestName}_tags_${l}`,
                    type: 'asset',
                    source: tryWrite(buf => new Binary(buf).writeTagLoca(strings)),
                });
            });
        }
    }
}
