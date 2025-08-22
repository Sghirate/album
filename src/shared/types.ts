export type Dimensions = {
    width: number;
    height: number;
}
export type TagInfo = {
    tag: string;
    [lang:string]: string;
}
export type ImageInfo = Dimensions & {
    url?: string;
}
export type PhotoInfo = {
    long?: number;
    lat?: number;
    stars?: number;
    tags: string[];
    ts?: number;
    image: ImageInfo;
    thumb: ImageInfo;
}
export type Manifest = {
    tags: (TagInfo|string)[];
    photos: Record<string, PhotoInfo>;
}
export type Shapes = 'image'|'thumb';
