/** Wrapper around the properties parsed by exifr.
 * Not complete; Not fully commented; Not guaranteed to have the correct type.
 * TODO: document more properties.
 */
export interface PhotoMetaData {
    /** When was the photo taken. */
    DateTimeOriginal?: Date;
    /** Star-Rating of the photo [1 - 5] */
    Rating?: number;
    /** Where was the photo taken. Parsed from a GPS tag (if present). */
    longitude?: number;
    /** Where was the photo taken. Parsed from a GPS tag (if present). */
    latitude?: number;
    /** What does the photo contain. */
    subject?: (string[])|string;
    JFIFVersion?: number;
    ResolutionUnit?: string;
    XResolution?: number;
    YResolution?: number;
    ThumbnailWidth?: number;
    ThumbnailHeight?: number;
    GPSVersionID?: string;
    GPSLongitude?: number[];
    GPSLatitude?: number[];
    DerivedFrom?: string;
    creator?: string;
    publisher?: string;
    rights?: {
        lang?: string;
        value?: string;
    };
    history?: {
        enabled: number;
        modversion: number;
        num: number;
        operation: string;
        params: string;
    }[];
    ProfileCMMType?: string;
    ProfileVersion?: string;
    ProfileClass?: string;
    ColorSpaceData?: string;
    ProfileConnectionSpace?: string;
    ProfileDateTime: Date;
    ProfileFileSignature?: string;
    PrimaryPlatform?: string;
    DeviceManufacturer?: string;
    DeviceModel?: string;
    RenderingIntent?: string;
    ProfileCreator?: string;
    ProfileDescription?: string;
    ProfileCopyright?: string;
    MediaWhitePoint?: Uint8Array;
    ChromaticAdaptation?: Uint8Array;
    RedMatrixColumn?: Uint8Array;
    BlueMatrixColumn?: Uint8Array;
    GreenMatrixColumn?: Uint8Array;
    RedTRC?: Uint8Array;
    GreenTRC?: Uint8Array;
    BlueTRC?: Uint8Array;
    Chromaticity?: Uint8Array;
    DeviceModelDesc?: string;
    DeviceMfgDesc?: string;
    ImageDescription?: string;
    Make?: string;
    Model?: string;
    Orientation?: string;
    Software?: string;
    ModifyDate?: Date;
    Artist?: string;
    YCbCrPositioning?: number;
    RatingPercent?: number;
    Copyright?: string;
    ExposureTime?: number;
    FNumber?: number;
    ExposureProgram?: string;
    ISO?: number;
    ExifVersion?: string;
    CreateDate?: Date;
    OffsetTime?: string;
    OffsetTimeOriginal?: string;
    ShutterSpeedValue?: number;
    ApertureValue?: number;
    BrightnessValue?: number
    ExposureCompensation?: number;
    MaxApertureValue?: number;
    MeteringMode?: string;
    Flash?: string;
    FocalLength?: number;
    SubSecTime?: string;
    SubSecTimeOriginal?: string;
    SubSecTimeDigitized?: string;
    ColorSpace?: number;
    ExifImageWidth?: number;
    ExifImageHeight?: number;
    ExposureMode?: string;
    WhiteBalance?: string;
    DigitalZoomRatio?: number;
    FocalLengthIn35mmFormat?: number;
    SceneCaptureType?: string;
    ImageUniqueID?: string;
    GPSLatitudeRef?: 'N' | 'S';
    GPSLongitudeRef?: 'W' | 'E';
}
