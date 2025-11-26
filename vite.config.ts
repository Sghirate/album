import { build, defineConfig, loadEnv } from 'vite';
import gallery, { hasImageExtension } from './src/vite/plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        define: {
            BUILD_TIMESTAMP: JSON.stringify(Date.now().toString(16)),
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
            manifest: true,
        },
    }
})
