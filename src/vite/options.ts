import sharp from "sharp";
import { Photo } from "./photo";
import { LogLevel } from "vite";

//#region Input
export interface InputOptions {
    /** Root folder to be scanned for image files. */
    dir: string;
    /** Path to tag loca file. */
    tagLoca?: string;
}
//#endregion Input

//#region Output
type OutputFormatJpg = {
    type: 'jpg',
    options?: sharp.JpegOptions;
}
type OutputFormatPng = {
    type: 'png',
    options?: sharp.PngOptions;
}
type OutputFormatWebp = {
    type: 'webp',
    options?: sharp.WebpOptions;
}
type OutputFormatAvif = {
    type: 'avif',
    options?: sharp.AvifOptions;
}
type OutputFormatGif = {
    type: 'gif',
    options?: sharp.GifOptions;
}
type OutputFormatTiff = {
    type: 'tiff',
    options?: sharp.TiffOptions;
}
type OutputFormat = OutputFormatJpg | OutputFormatPng | OutputFormatWebp | OutputFormatAvif | OutputFormatGif | OutputFormatTiff;
export type ImageOutputParams = {
    /** Maximum pixel size of images. Will resize images to fit into maxPixelDimension x maxPixelDimension. */
    maxPixelDimension: number;
    /** Output format. Wrapper around sharp's toFormat parameters. */
    format: OutputFormat;
}
export type OutputOptions = {
    /** Output parameters for the image shape of a photo. */
    image: ImageOutputParams;
    /** Output paramters for the thumbnail shape of a photo. */
    thumb: ImageOutputParams;
}
//#endregion Output

//#region Filter
/** Plugin will only work with files for which the filter returns true. */
export type PathFilter = (path: string) => boolean;
/** Plugin will only work with photos for which the filter returns true. */
export type PhotoFilter = (photo: Photo) => boolean;

export interface FilterOptions {
    path?: PathFilter[];
    photo?: PhotoFilter[];
}
//#endregion Filter

//#region Cache
export type CacheOptions = {
    /** Cache directory. Can be absolute or relative to the project root.
     * If the directory does not exist, it will be create when initializing the plugin.
     * @example './node_modules/cache/gallery'
     */
    dir: string;
}
//#endregion Cache

//#region Plugin
export type ManifestGenerator = (photos: Photo[]) => any;
export type PluginOptions = {
    /** Log level with which gallery messages are logged. */
    logLevel?: LogLevel;
    /** Input Options. Required. 
     * Necessary to collect photos from a directory and serve them via vite.
    */
    input: InputOptions;
    /** Output Options. Required.
     * Determines how images are generated (mostly max size).
     */
    output: OutputOptions;
    /** Filter Options. Optional.
     * If set, the plugin will only load files matching the given filter set.
     */
    filter?: FilterOptions;
    /** Cache Options. Optional.
     * If set the plugin will store some metadata and processed images to a cache folder.
     * This results in more disk space being used by vite, however images can be served faster.
     */
    cache?: CacheOptions;
    /** Function used to generate the gallery manifest that will be served during development and create during build.
     * Will include all the index-data that is loaded while the gallery is being intialized on the website and used to
     * search and filter the photos.
     */
    manifest?: ManifestGenerator;
}
//#endregion Plugin
