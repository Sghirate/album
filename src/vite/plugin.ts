import { readFile } from 'fs/promises';
import { IncomingMessage, ServerResponse } from 'http';
import { join, resolve } from 'path';
import colors from 'picocolors';
import ProgressBar from 'progress';
import { PluginContext } from 'rollup';
import { Connect, createLogger, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { Manifest, PhotoInfo, Shapes, UrlSchema } from '../shared/types';
import { createCache } from './cache';
import { createFilter } from './filter';
import { convertAsync } from './image';
import { createInput } from './input';
import { makeContentHash } from './makeContentHash';
import { PluginOptions } from './options';
import { Photo } from './photo';
import transformIndex from './transformIndex';
export {
    hasAnySubject, hasExtension, hasGPSTag, hasImageExtension,
    hasMinimumRating, invertFilter
} from './filter';

/** Vite plugin instance. */
export default function gallery(options: PluginOptions): Plugin {
    const logger = createLogger(options.logLevel, {
        prefix: '[gallery]',
    });
    const idPrefix = '/@gallery/';
    const idManifest = `${idPrefix}manifest`
    const idImagePrefix = `${idPrefix}image/`
    const idThumbPrefix = `${idPrefix}thumb/`
    const input = createInput(logger, options.input, options.output);
    const filter = options.filter && createFilter(options.filter);
    const cache = options.cache && createCache(logger, options.cache);

    let manifestName: string | undefined = undefined;
    let pluginContext: PluginContext;
    let viteConfig: ResolvedConfig;
    let viteServer: ViteDevServer;

    function generateSchema(): UrlSchema {
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
        return {
            image: resolveSchema('image'),
            thumb: resolveSchema('thumb'),
        };
    }

    function generateManifest(includeMeta: boolean = true): Manifest {
        const schema = generateSchema();
        const tags = [];

        // fallback manifest
        let maxStars = -1;
        const tagSet = new Set<string>();
        const photos: Record<string, PhotoInfo> = [...input.all()].reduce((r, p) => {
            (typeof p.meta.subject === 'string' ? [p.meta.subject] : (p.meta.subject ?? []))
                .forEach(t => tagSet.add(t));
            const info: PhotoInfo = {
                long: p.meta.longitude,
                lat: p.meta.latitude,
                stars: p.meta.Rating,
                tags: typeof p.meta.subject === 'string' ? [p.meta.subject] : (p.meta.subject ?? []),
                ts: p.meta.DateTimeOriginal?.getTime(),
                meta: includeMeta ? p.meta : undefined,
                image: { ...p.image },
                thumb: { ...p.thumb },
            }
            if (info.stars !== undefined) {
                maxStars = Math.max(maxStars, info.stars);
            }
            if (!info.image.url) {
                info.image.url = schema.image
                    .replace('#NAME#', p.name)
                    .replace('#HASH#', info.image.hash ?? '');
            }
            if (!info.thumb.url) {
                info.thumb.url = schema.thumb
                    .replace('#NAME#', p.name)
                    .replace('#HASH#', info.image.hash ?? '');
            }

            for (const tag of info.tags) {
                const idx = tags.indexOf(tag);
                if (idx < 0) {
                    tags.push(tag);
                }
            }

            r[p.name] = info;

            return r;
        }, {} as Record<string, any>);
        if (maxStars >= 0) {
            tagSet.add('top-rated');
            for (const name in photos) {
                const info = photos[name];
                if (info.stars === maxStars 
                    && !info.tags.includes('top-rated')
                ) {
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
    async function emitAllPhotosAsync(): Promise<number> {
        let done = 0;
        const emitPromises: Promise<void>[] = [];
        let bar;
        for (const photo of input.all()) {
            for (const shape of ['image', 'thumb'] as const) {
                emitPromises.push(emitPhotoAsync(photo, shape).finally(() => {
                    ++done;
                    bar?.tick({ done, total: emitPromises.length });
                }));
            }
        }
        const transforming = `${colors.magenta('Photos:')} :done/:total | `;
        const barText = `${colors.cyan(`[:bar]`)}`
        const barFormat = `${colors.green('Emitting Images')} ${barText} :percent | ${transforming}Time: :elapseds`
        bar = new ProgressBar(barFormat, {
            width: 40,
            complete: '\u2588',
            incomplete: '\u2591',
            total: emitPromises.length,
        });
        await Promise.all(emitPromises);
        bar.terminate();
        return emitPromises.length;
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
                // generate and serve manifest
                const json = generateManifest();
                res.statusCode = 200;
                return res.end(JSON.stringify(json));
            });
            viteServer.middlewares.use(idImagePrefix, photoRoute('image'));
            viteServer.middlewares.use(idThumbPrefix, photoRoute('thumb'));
        },
        transformIndexHtml(html: string): string {
            return transformIndex(html, generateManifest());
        },
        async buildStart() {
            pluginContext = this;
            let success = true;
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

            if (viteConfig.command === 'build') {
                await emitAllPhotosAsync();
            }
        },
        async generateBundle() {
            const manifest = await generateManifest(false);
            this.emitFile({
                fileName: manifestName,
                type: 'asset',
                source: JSON.stringify(manifest),
            });
        }
    }
}
