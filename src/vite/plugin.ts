import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PluginContext } from 'rollup';
import { Connect, createLogger, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { Manifest, PhotoInfo, Shapes, TagInfo } from '../shared/types';
import { createCache } from './cache';
import { createFilter } from './filter';
import { convertAsync } from './image';
import { createInput } from './input';
import { makeContentHash } from './makeContentHash';
import { PluginOptions } from './options';
import { Photo } from './photo';
import { IncomingMessage, ServerResponse } from 'http';

export {
    hasAnySubject, hasExtension, hasGPSTag, hasImageExtension,
    hasMinimumRating, invertFilter
} from './filter';

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
    const tagLoca = new Map<string, Record<string, string>>();

    let manifestName: string;
    let pluginContext: PluginContext;
    let viteConfig: ResolvedConfig;
    let viteServer: ViteDevServer;

    const virtualModuleId = 'virtual:gallery:url'
    const resolvedVirtualModuleId = '\0' + virtualModuleId;

    function generateManifest(): Manifest {
        if (options.manifest !== undefined) {
            return options.manifest([...input.all()]);
        } else {
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
            const tags: (TagInfo | string)[] = [...tagSet.values()].map(t => {
                const loca = tagLoca.get(t);
                return loca ? { tag: t, ...loca } : t;
            });
            return {
                tags,
                photos,
            } as Manifest;
        }
    }
    async function loadTagLocaAsync() {
        if (!tagLocaFile) {
            tagLoca.clear();
            return;
        }
        tagLoca.clear();
        try {
            const txt = await readFile(tagLocaFile, { encoding: 'utf8' });
            const json = JSON.parse(txt) as Record<string, Record<string, string>>;
            for (const k in json) {
                tagLoca.set(k, json[k]);
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
        const ext = options.output[shape].format.type;
        photo[shape].url = join(viteConfig.build.assetsDir, `${photo.name}_${shape}_${contentHash}.${ext}`);
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
            manifestName = config.mode !== 'test'
                ? `${JSON.parse(viteConfig?.define?.BUILD_TIMESTAMP)}.json`
                : '-NONE-';
        },
        configureServer(server: ViteDevServer) {
            viteServer = server;
            server.middlewares.use(idManifest, (_req, res) => {
                // Ensure all photos have urls set
                for (const photo of input.all()) {
                    photo.image.url = `${idImagePrefix}${photo.name}`
                    photo.thumb.url = `${idThumbPrefix}${photo.name}`
                }
                // generate and serve manifest
                const json = generateManifest();
                res.statusCode = 200;
                return res.end(JSON.stringify(json));
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
                const apiUrl = `/@gallery/manifest?ts=${new Date().getTime()}`;
                const url = viteConfig.command === 'serve' ? apiUrl : manifestName;
                return `const url = '${url}'; export default url`;
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
        }
    }
}
