import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/photoswipe.css';
import { make } from './dom';
import { Events, makeEvents } from './events';
import { SelectedPhoto } from './types';

type GalleryEvents = {
    onInitialized: undefined;
    onError: Error | string;
}
export type Gallery = {
    events: Events<GalleryEvents>;
    element: HTMLElement;
    container: HTMLDivElement;
    items: Record<string, HTMLAnchorElement>;
    isInitialized: boolean;
    lightbox: PhotoSwipeLightbox;
    open(name: string): boolean;
    update(selection: SelectedPhoto[]): void;
    initAsync(): Promise<void>;
}
const element = make('div');
const gallery: Gallery = {
    events: makeEvents(),
    element,
    container: make('div', e => {
        e.id = 'gallery';
        element.appendChild(e);
    }),
    items: {},
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
        const ele = gallery.items[name];
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
            if (!(name in gallery.items)) {
                gallery.items[name] = make('a', e => {
                    e.id = `photo-${name}`;
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
            }
            const ele = gallery.items[name];
            newChildren.push(ele);
        }
        gallery.container.replaceChildren(...newChildren);
    },
    async initAsync() {
        if (gallery.isInitialized) {
            return;
        }

        try {
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
