import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/photoswipe.css';
import { make } from './dom';
import { Events, makeEvents } from './events';
import { SelectedPhoto } from './types';

const idPrefix = 'photo-';

/** Events emitted by Gallery.events */
type GalleryEvents = {
    onInitialized: undefined;
    onError: Error | string;
    onPhotoChanged: string | null;
}
/** Gallery module. Responsible for update the photoswipe element with the selected photos. */
export type GalleryModule = {
    /** Event Emitter. */
    events: Events<GalleryEvents>;
    /** Root element of the gallery. Will be added to the app. */
    element: HTMLElement;
    /** Container element for photos. */
    container: HTMLDivElement;
    /** Photo items. Photo anchrs will be created the first time they are needed and then kept
     * in the mapping - however removed from the container element, if they are not selected for display.
     */
    items: Map<string, HTMLAnchorElement>;
    /** True, if the photoswipe lightbox is initialized. */
    isInitialized: boolean;
    /** Photoswipe lightbox instance. */
    lightbox: PhotoSwipeLightbox;
    /** Open a photo in the photoswipe lightbox.
     * @param name The photo name as it appears in the app manifest.
     * @returns true if the photo is in the set of selected photos and could be opened.
     */
    open(name: string): boolean;
    /** Update the visible elements based on a photo selection.
     * @param selection Set of photos to dispplay in the gallery.
     */
    update(selection: SelectedPhoto[]): void;
    /** Initializes the photoswipe lightbox - should be the first module function that is being called.
     * Note: the module element will already exist before initializing the gallery.
     * 
     */
    initAsync(): Promise<void>;
}
const element = make('div');
const gallery: GalleryModule = {
    events: makeEvents(),
    element,
    container: make('div', e => {
        e.id = 'gallery';
        element.appendChild(e);
    }),
    items: new Map<string, HTMLAnchorElement>(),
    isInitialized: false,
    lightbox: new PhotoSwipeLightbox({
        // may select multiple "galleries"
        gallery: '#gallery',

        // Elements within gallery (slides)
        children: 'a',

        // setup PhotoSwipe Core dynamic import
        pswpModule: PhotoSwipe
    }),
    open(name: string): boolean {
        const ele = gallery.items.get(name);
        if (!ele) {
            return false;
        }
        const idx = [...gallery.container.children].indexOf(ele);
        if (idx < 0) {
            return false;
        }
        gallery.lightbox.loadAndOpen(idx);
        return true;
    },
    update(selection: SelectedPhoto[]): void {
        const newChildren: HTMLAnchorElement[] = [];
        for (const { name, photo } of selection) {
            let ele = gallery.items.get(name);
            if (!ele) {
                ele = make('a', e => {
                    e.id = `${idPrefix}${name}`;
                    e.href = photo.image.url!;
                    e.target = '_blank';
                    e.setAttribute('data-pswp-width', `${photo.image.width}`);
                    e.setAttribute('data-pswp-height', `${photo.image.height}`);
                    make('img', img => {
                        img.id = `img-${name}`;
                        img.src = photo.thumb.url!;
                        img.width = photo.thumb.width;
                        img.height = photo.thumb.height;
                        img.alt = name;
                        e.appendChild(img);
                    });
                });
                gallery.items.set(name, ele);
            }
            newChildren.push(ele);
        }
        gallery.container.replaceChildren(...newChildren);
    },
    async initAsync() {
        if (gallery.isInitialized) {
            return;
        }

        try {
            gallery.lightbox.on('change', () => {
                const id = gallery.lightbox.pswp?.currSlide?.data.element?.id;
                const name = (id !== undefined && id.startsWith(idPrefix))
                    ? id.substring(idPrefix.length)
                    : null;
                gallery.events.emit('onPhotoChanged', name);
            });
            gallery.lightbox.on('close', () => {
                gallery.events.emit('onPhotoChanged', null);
            });
            gallery.lightbox.init();
            gallery.isInitialized = true;
            gallery.events.emit('onInitialized', undefined);
        } catch (e) {
            const err = ((e instanceof Error) || typeof e === 'string') ? e : 'Unknown Error';
            gallery.events.emit('onError', err);
        }
    },
}

export default gallery;
