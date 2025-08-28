import sharp from 'sharp';
import { Dimensions } from "../shared/types";
import { ImageOutputParams } from "./options";
import { Photo } from "./photo";

/** Convert a photo to an output image.
 * @param photo As read and stored by the input registry.
 * @param dim Output dimensions of the photo.
 * @param options parameters used to control the conversion. Mostly a wrapper around sharp toFormat parameters.
 */
export async function convertAsync(photo: Photo, dim: Dimensions, options: ImageOutputParams): Promise<Buffer> {
    const s = sharp(photo.path);
    if (options.keepMetadata === true) {
        s.keepMetadata();
    }
    s.resize(dim.width, dim.height);
    const buffer = await s.toFormat(options.format.type, options.format.options).toBuffer();
    return buffer;
}
/** Read the pixel size of an image. */
export async function getSizeAsync(path: string): Promise<Dimensions> {
    const meta = await sharp(path).metadata();
    const { width, height } = meta;
    return { width, height };
}
