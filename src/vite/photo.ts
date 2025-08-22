import { Dimensions, ImageInfo } from "../shared/types";
import { PhotoMetaData } from "./metadata";

export type Photo = {
    path: string;
    name: string;
    meta: PhotoMetaData;
    size: Dimensions;
    image: ImageInfo;
    thumb: ImageInfo;
}
