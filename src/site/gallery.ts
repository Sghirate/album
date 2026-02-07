import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/photoswipe.css';
import { Module } from './module';
import shared from './shared';

const selector = 'a:not([hidden])';
const idPrefix = 'photo-';

class GalleryModule implements Module {
    private id: string | undefined;
    private items = new Map<string, HTMLAnchorElement>();
    private lightbox: PhotoSwipeLightbox | undefined;
    private container: HTMLElement | null = null;

    private onPhotoChanged = () => {
        if (!this.container || !this.lightbox) {
            return;
        }
        const name = shared.open.value;
        const ele = this.items.get(name);
        if (!ele) {
            this.lightbox.pswp?.close();
            return;
        }
        const visible = this.container.querySelectorAll(selector);
        const idx = [...visible].indexOf(ele);
        if (idx >= 0) {
            this.lightbox.pswp?.goTo(idx)
                || this.lightbox.loadAndOpen(idx)
        }
    }
    private onFilterChanged = () => {
        this.update();
    }
    private onManifestChanged = () => {
        this.update();
    }
    private onGalleryChange = () => {
        const id = this.lightbox?.pswp?.currSlide?.data.element?.id;
        const name = (id !== undefined && id.startsWith(idPrefix))
            ? id.substring(idPrefix.length)
            : null;
        shared.open.value = name ?? '';
    }
    private onGalleryClose = () => {
        shared.open.value = '';
    }

    init(id?: string): void {
        this.id = id;
        if (id && !this.container) {
            this.container = document.querySelector(`#${id}-container`);
        }
        if (this.container) {
            for (const anchor of this.container.querySelectorAll(`a`)) {
                const name = anchor.id.substring(idPrefix.length);
                if (!name) {
                    continue;
                }
                this.items.set(name, anchor);
            }
        }

        if (this.container) {
            this.lightbox = new PhotoSwipeLightbox({
                gallery: this.container,
                children: selector,
                pswpModule: PhotoSwipe,
            });
            this.lightbox.on('uiRegister', () => {
                this.lightbox?.pswp?.ui?.registerElement({
                    name: 'download-button',
                    order: 8,
                    isButton: true,
                    tagName: 'a',

                    html: {
                        isCustomSVG: true,
                        inner: '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
                        outlineID: 'pswp__icn-download'
                    },

                    onInit: (el, pswp) => {
                        el.setAttribute('download', '');
                        el.setAttribute('target', '_blank');
                        el.setAttribute('rel', 'noopener');

                        pswp.on('change', () => {
                            if (pswp?.currSlide?.data.src && (el instanceof HTMLAnchorElement)) {
                                el.href = pswp.currSlide.data.src;
                            }
                        });
                    },
                });
            });
            this.lightbox.on('change', this.onGalleryChange);
            this.lightbox.on('close', this.onGalleryClose);
            this.lightbox.init();
        }

        this.update();
        this.onPhotoChanged();

        shared.manifest.on(this.onManifestChanged);
        shared.filter.on(this.onFilterChanged);
        shared.open.on(this.onPhotoChanged);
    }
    hmr(old: this): void {
        const any = old.id || old.container || old.lightbox;
        if (any) {
            this.container = old.container;
        }
        old[Symbol.dispose]();
        if (any) {
            this.init(old.id);
        }
    }
    [Symbol.dispose](): void {
        shared.manifest.off(this.onManifestChanged);
        shared.filter.off(this.onFilterChanged);
        shared.open.off(this.onPhotoChanged);

        if (this.lightbox) {
            this.lightbox.off('change', this.onGalleryChange);
            this.lightbox.off('close', this.onGalleryClose);
            this.lightbox.destroy();
        }
    }

    private update() {
        if (!this.container) {
            return;
        }
        const selected = shared.filter.value;
        for (const anchor of this.container.querySelectorAll('a')) {
            const tags = anchor.dataset['tags']?.split(',');
            const isSelected = !selected
                || selected.length == 0
                || selected.every(t => tags?.includes(t));
            anchor.hidden = !isSelected;
        }

        const pswp = this.lightbox?.pswp;
        if (pswp) {
            const id = pswp.currSlide?.data.element?.id;
            const elements: HTMLElement[] = Array.from(this.container.querySelectorAll(selector));
            const dataSource = {
                gallery: this.container,
                items: elements,
            };
            const idx = elements.findIndex(e => e.id === id);
            if (idx >= 0) {
                pswp.options.dataSource = dataSource;
                pswp.dispatch('change');
                pswp.refreshSlideContent(idx);
                pswp.goTo(idx);
                pswp.mainScroll.itemHolders.forEach(v => {
                    if (v.slide) {
                        pswp.refreshSlideContent(v.slide.index);
                    }
                });
            } else {
                pswp.close();
            }
        }
    }
}
let gallery = new GalleryModule();
export default gallery;

if (import.meta.hot) {
    import.meta.hot.accept((newMod) => {
        if (newMod) {
            const newGallery = newMod.default;
            newGallery.hmr(gallery);
            gallery = newGallery;
        }
    });
}
