import { PhotoMetaData } from "./metadata";

/** Basic image dimensions helper. Size is assumed to be in pixels.
 * Make sure to round to full pixels.
 */
export type Dimensions = {
    /** Image width in pixels. */
    width: number;
    /** Image height in pixels. */
    height: number;
}
/** Output image info. */
export type ImageInfo = Dimensions & {
    /** Will be undefined if the image has not been written (yet). */
    url?: string;
    hash?: string;
}
/** General information about a photo loaded form the input folder. */
export type PhotoInfo = {
    /** Longitude. Converted from the GPS tag (by exifr) - will be undefined, if the image has no GPS tag. */
    long?: number;
    /** Latitude. Converted from the GPS tag (by exifr) - will be undefined, if the image has no GPS tag. */
    lat?: number;
    /** 'Star Rating' of the image. Typically based on the 'rating' XMP data. */
    stars?: number;
    /** Tag-array. Seeded with the XMP subject tags. Might contain additional tags. */
    tags: string[];
    /** Timestamp version of the original image creation date. Typically the time the photo was taken. */
    ts?: number;
    /** Information about the converted output image of the photo. */
    image: ImageInfo;
    /** Information about the converted thumbnail image of the photo. */
    thumb: ImageInfo;
    /** Complete set of parsed photo meta data. Can be empty or undefined! */
    meta?: PhotoMetaData;
}
/** Manifest generated during builds/previews. Containing all the info the client/website needs to load and display the gallery. */
export type Manifest = {
    /** All tags available to the client. */
    tags: string[];
    /** All photos available to the client. */
    photos: Record<string, PhotoInfo>;
}
export type UrlSchema = {
    image: string;
    thumb: string;
}
/** Different output 'shapes' of a photo. Relates to property names inside PhotoInfo and the OutputOptions. */
export type Shapes = 'image' | 'thumb';
