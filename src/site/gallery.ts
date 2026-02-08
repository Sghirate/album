import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/photoswipe.css';
import { Module } from './module';
import shared from './shared';
import state from './state';
import TagsModule from './tags';

const selector = 'a:not([hidden])';
const idPrefix = 'photo-';

const local = state.register({
    infoOpen: {
        key: 'i',
        type: 'bool',
        location: 'browser',
    }
});


class GalleryModule implements Module {
    private id: string | undefined;
    private items = new Map<string, HTMLAnchorElement>();
    private lightbox: PhotoSwipeLightbox | undefined;
    private container: HTMLElement | null = null;
    private tags = new TagsModule();

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

                this.lightbox?.pswp?.ui?.registerElement({
                    name: 'info-button',
                    order: 7,
                    isButton: true,
                    tagName: 'button',

                    html: {
                        isCustomSVG: true,
                        inner: '<path d="M 25 2 C 12.309295 2 2 12.309295 2 25 C 2 37.690705 12.309295 48 25 48 C 37.690705 48 48 37.690705 48 25 C 48 12.309295 37.690705 2 25 2 z M 25 4 C 36.609824 4 46 13.390176 46 25 C 46 36.609824 36.609824 46 25 46 C 13.390176 46 4 36.609824 4 25 C 4 13.390176 13.390176 4 25 4 z M 25 11 A 3 3 0 0 0 22 14 A 3 3 0 0 0 25 17 A 3 3 0 0 0 28 14 A 3 3 0 0 0 25 11 z M 21 21 L 21 23 L 22 23 L 23 23 L 23 36 L 22 36 L 21 36 L 21 38 L 22 38 L 23 38 L 27 38 L 28 38 L 29 38 L 29 36 L 28 36 L 27 36 L 27 21 L 26 21 L 22 21 L 21 21 z" id="pswp__icn-info"/>',
                        size: 50,
                        outlineID: 'pswp__icn-info'
                    },

                    onClick: () => {
                        local.infoOpen.value = !local.infoOpen.value;
                    }
                });

                this.lightbox?.pswp?.ui?.registerElement({
                    name: 'info-overlay',
                    order: 9,
                    isButton: false,
                    appendTo: 'root',
                    html: ``,
                    onInit: (el, pswp) => {
                        el.classList.add('info');
                        const setOpen = (open: boolean) => {
                            if (open) {
                                el.classList.add('open')
                            } else {
                                el.classList.remove('open');
                            }
                        }
                        setOpen(local.infoOpen.value);
                        local.infoOpen.on(() => {
                            setOpen(local.infoOpen.value);
                        });

                        const elTitle = el.appendChild(document.createElement('div'));
                        elTitle.classList.add('title');

                        const elTagsTitle = document.createElement('span');
                        elTagsTitle.dataset['loca'] = 'tags';
                        elTagsTitle.innerHTML = 'Tags';
                        elTagsTitle.classList.add('tags-title');
                        el.appendChild(elTagsTitle);

                        const elTagsContainer = el.appendChild(document.createElement('div'));
                        elTagsContainer.id = 'gallery-tags-container';
                        elTagsContainer.classList.add('tags-container');

                        const elCopyright = el.appendChild(document.createElement('div'));
                        elCopyright.classList.add('copyright');

                        pswp.on('change', () => {
                            this.tags[Symbol.dispose]();
                            if (!pswp.currSlide) {
                                elTitle.innerHTML = elTagsContainer.innerHTML = elCopyright.innerHTML = '';
                                return;
                            }

                            const currSlideElement = pswp?.currSlide.data.element;

                            const title = currSlideElement?.dataset['title'] ?? '';
                            elTitle.innerHTML = title;

                            const tags = currSlideElement?.dataset['tags']?.split(',') ?? [];
                            elTagsContainer.innerHTML = tags.map(t => `<button name="${t}" class="tag" data-loca="tag-${t}" value>${t}</button>`).join('');
                            this.tags.init('gallery-tags');

                            const by = currSlideElement?.dataset['by'] ?? '';
                            const rights = currSlideElement?.dataset['copyright'] ?? '';
                            if (!by && !rights) {
                                elCopyright.innerHTML = '';
                            } else {
                                let strCopyright = `Copyright: `;
                                if (by) {
                                    strCopyright += `${by}, `
                                }
                                if (rights) {
                                    if (rights.startsWith('CC ')) {
                                        const license = rights.substring(3);
                                        strCopyright += `<a href="https://creativecommons.org/licenses/${license}/4.0/" target="_blank">${rights}</a>`
                                    } else {
                                        strCopyright += rights;
                                    }
                                }
                                elCopyright.innerHTML = strCopyright;
                            }
                        })
                    }
                })
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

        this.tags[Symbol.dispose]();
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
