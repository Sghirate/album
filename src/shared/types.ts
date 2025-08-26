/** Basic image dimensions helper. Size is assumed to be in pixels.
 * Make sure to round to full pixels.
 */
export type Dimensions = {
    /** Image width in pixels. */
    width: number;
    /** Image height in pixels. */
    height: number;
}
/** Information about a single tag. Typically generated from the XMP subject data, plus custom tags.
 */
export type TagInfo = {
    /** String representation of the tag. */
    tag: string;
    /** Language => display string mapping.
     * Language ought be a 2-letter iso identifier (e.g. 'en' for english).
     * If a UI language is not present in this mapping, en will be used as a fallback.
     * If en is not present, the string representation (see above) will be used.
     */
    [lang:string]: string;
}
/** Output image info. */
export type ImageInfo = Dimensions & {
    /** Will be undefined if the image has not been written (yet). */
    url?: string;
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
}
/** Manifest generated during builds/previews. Containing all the info the client/website needs to load and display the gallery. */
export type Manifest = {
    /** All tags available to the client. */
    tags: (TagInfo|string)[];
    /** All photos available to the client. */
    photos: Record<string, PhotoInfo>;
}
/** Different output 'shapes' of a photo. Relates to property names inside PhotoInfo and the OutputOptions. */
export type Shapes = 'image'|'thumb';
