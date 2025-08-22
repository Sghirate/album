import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import url from 'virtual:gallery:url';
import { Manifest } from '../shared/types';
import { Events, makeEvents } from './events';
import { make } from './dom';
import 'photoswipe/photoswipe.css';

type GalleryEvents = {
  onInitialized: undefined;
  onError: Error | string;
}
export type Gallery = {
  events: Events<GalleryEvents>;
  container: HTMLDivElement;
  items: Record<string, HTMLAnchorElement>;
  isInitialized: boolean;
  manifest: Manifest | undefined;
  lightbox: PhotoSwipeLightbox;
  update(selectedTags: string[]): void;
  initAsync(): Promise<void>;
}
const gallery: Gallery = {
  events: makeEvents(),
  container: make('div', e => e.id = 'gallery'),
  items: {},
  isInitialized: false,
  manifest: undefined,
  lightbox: new PhotoSwipeLightbox({
    // may select multiple "galleries"
    gallery: '#gallery',

    // Elements within gallery (slides)
    children: 'a',

    // setup PhotoSwipe Core dynamic import
    pswpModule: PhotoSwipe
  }),
  update(selectedTags: string[]): void {
    console.log(selectedTags);
    const newChildren: HTMLAnchorElement[] = [];
    const all = gallery.manifest?.photos ?? {};
    for (const name in all) {
      const photo = all[name];
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
      // filter based on tag selection
      if (selectedTags.length > 0 && selectedTags.some(t => !photo.tags.includes(t))) {
        continue;
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
      const res = await fetch(url);
      const json = await res.json();
      gallery.manifest = json;
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
