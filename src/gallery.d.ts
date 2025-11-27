e/** Virtual module to provide the manifest. The manifest is the typescript data used by the site
 * plus some helper information for retrieving files.
 */
declare module 'virtual:gallery:manifest' {
    const manifest: {
        // Binary data of the manifest, matches the type defined in src/shared/types.ts
        data: Uint8Array;
        // URL schema for images; Used to construct request URLs (contains placeholders for name, hash & ext)
        schema: {
            image: string;
            thumb: string;
        };
        // Per-language tag loca file URLs.
        tagLoca: { [lang: string]: string };
    };
    export default manifest;
}
