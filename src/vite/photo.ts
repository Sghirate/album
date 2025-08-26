import { Dimensions, ImageInfo } from "../shared/types";
import { PhotoMetaData } from "./metadata";

/** Photo instead stored in the input regiostry. */
export type Photo = {
    /** File path. */
    path: string;
    /** Photo name.
     * Either an ISO8601-like timestamp string of when the photo was taken,
     * or the file name (whithout extension) of the photo if no original date could be determined.
     */
    name: string;
    /** Metadata parsed from the input file. */
    meta: PhotoMetaData;
    /** Input file dimensions. */
    size: Dimensions;
    /** Output file data. Url will be populated once the photo has been converted to that shape. */
    image: ImageInfo;
    /** Output file data. Url will be populated once the photo has been converted to that shape. */
    thumb: ImageInfo;
}
