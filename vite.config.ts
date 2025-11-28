import { build, defineConfig, loadEnv } from 'vite';
import gallery, { hasImageExtension } from './src/vite/plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        define: {
            BUILD_TIMESTAMP: JSON.stringify(Date.now().toString(16)),
            MAP_PROVIDER: JSON.stringify(
                env.MAP_PROVIDER
                ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ),
            MAP_ATTRIBUTION: JSON.stringify(
                env.MAP_ATTRIBUTION
                ?? '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            ),
            MAP_ZOOM_MIN: env.MAP_ZOOM_MIN ?? 3,
            MAP_ZOOM_MAX: env.MAP_ZOOM_MAX ?? 19,
        },
        plugins: [
            gallery({
                input: {
                    dir: env.GALLERY_DIR,
                    tagLoca: env.TAG_LOCA_FILE,
                },
                output: {
                    image: {
                        keepMetadata: true,
                        maxPixelDimension: 2000,
                        format: {
                            type: 'jpg',
                            options: {
                                quality: 90,
                            }
                        },
                        schema: '#NAME#_image_#HASH##EXT#',
                    },
                    thumb: {
                        maxPixelDimension: 256,
                        format: {
                            type: 'jpg',
                            options: {
                                quality: 50,
                            },
                        },
                        schema: '#NAME#_thumb_#HASH##EXT#',
                    },
                },
                filter: {
                    path: [
                        hasImageExtension,
                    ],
                },
                cache: {
                    dir: './node_modules/.cache/gallery',
                },
            }),
        ],
        build: {
            assetsInlineLimit(filePath: string): boolean | undefined {
                if (filePath.includes('leaflet/dist')) {
                    return false;
                }
                return undefined;
            },
            manifest: true,
            rollupOptions: {
                treeshake: 'smallest'
            }
        },
    }
})
