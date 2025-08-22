import sharp from 'sharp';
import { Dimensions } from "../shared/types";
import { ImageOutputParams } from "./options";
import { Photo } from "./photo";

export async function convertAsync(photo: Photo, dim: Dimensions, options: ImageOutputParams): Promise<Buffer> {
    return await sharp(photo.path)
        .resize(dim.width, dim.height)
        .toFormat(options.format.type, options.format.options)
        .toBuffer();
}
export async function getSizeAsync(path: string): Promise<Dimensions> {
    const meta = await sharp(path).metadata();
    const { width, height } = meta;
    return { width, height };
}
