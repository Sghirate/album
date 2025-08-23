import { FilterOptions, PathFilter, PhotoFilter } from "./options";
import { Photo } from "./photo";

//#region Path Filters
// Limited by exifr, and (to a lesser extent) sharp
/** Will return true with the path ends with any of the provided extensions.
 * The comparison is automatically performed on the lower case version of the extension.
*/
export function hasExtension(...extensions: string[]): PathFilter {
    const lExtensions = extensions.map(e => e.toLowerCase());
    return function (path: string): boolean {
        const idx = path.lastIndexOf('.');
        return idx > 0
            && lExtensions.includes(path.substring(idx + 1).toLowerCase());
    }
}
const SupportedExtensions = ['jpg', 'jpeg', 'jpe', 'avif', 'png', 'tiff', 'tif'];
/** Check if the path ends with the extension of a supported image format. Supported formats:
 * - JPG(/JPEG/JPE)
 * - AVIF
 * - PNG
 * - TIFF
 */
export const hasImageExtension = hasExtension(...SupportedExtensions);
//#endregion Path Filters

//#region Photo Filters
/** Check if the photo has a rating of at-least the given value.
 * If the photo does not have a rating tag, it will automatically be rejecetd.
 */
export function hasMinimumRating(stars: number): PhotoFilter {
    return function (photo: Photo): boolean {
        return photo.meta.Rating !== undefined
            && photo.meta.Rating >= stars;
    }
}
/** Check if the photo has a GPS Tag. */
export const hasGPSTag: PhotoFilter = function (photo: Photo) {
    return photo.meta.longitude !== undefined
        && photo.meta.latitude !== undefined;
}
/** Check if the photo has any of the given subject tags.
 * Photos without subject tags will be automatically rejected.
 * Any tag from the set satifies this check. Case sensitive!
 */
export function hasAnySubject(...tags: string[]): PhotoFilter {
    return function (photo: Photo) {
        if (photo.meta.subject === undefined) {
            return false;
        }
        if (typeof photo.meta.subject === 'string'
            && tags.includes(photo.meta.subject)
        ) {
            return true;
        }
        if (Array.isArray(photo.meta.subject)
            && photo.meta.subject.some(t => tags.includes(t))
        ) {
            return true;
        }
        return false;
    }
}
//#endregion Photo Filters

//#region Meta Filters
/** Invert the result of another filter.
 * Can be used to ensure a photo does not include a given subject by inverting the hasAnySubject filter.
 */
export function invertFilter<T = string | Photo>(filter: (arg: T) => boolean): (arg: T) => boolean {
    return function (arg: T): boolean {
        return !filter(arg);
    }
}
//#endregion Meta Filters

//#region Combined Filter
export interface Filter {
    path: PathFilter;
    photo: PhotoFilter;
}
export function createFilter(options: FilterOptions): Filter {
    return {
        path(path: string): boolean {
            return options.path === undefined
                || options.path.every(f => f(path));
        },
        photo(photo: Photo): boolean {
            return options.photo === undefined
                || options.photo.every(f => f(photo));
        },
    }
}
//#endregion Combined Filter
