import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { FeatureGroup, Icon, Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Module } from "./module";
import shared from './shared';
import state from "./state";

if (import.meta.env.PROD) {
    Icon.Default.prototype.options.iconUrl = markerIconUrl;
    Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
    Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
    Icon.prototype.options.iconUrl = markerIconUrl;
    Icon.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
    Icon.prototype.options.shadowUrl = markerShadowUrl;
}

const local = state.register({
    open: {
        key: 'm',
        type: 'bool',
        location: 'browser',
    }
});

class MapModule implements Module {
    private id: string | undefined;
    private map: LeafletMap | undefined;
    private layer: TileLayer | undefined;
    private observer: IntersectionObserver | undefined;
    private gallery: HTMLElement | null = null;
    private markers = new Map<string, Marker>();
    private expander: HTMLDetailsElement | null = null;
    private container: HTMLElement | null = null;

    private onOpenChanged = () => {
        if (this.expander) {
            this.expander.open = local.open.value;
        }
    }
    private onFilterChanged = () => {
        this.update();
    }
    private onPhotoChanged = () => {
        const name = shared.open.value;
        if (name !== null) {
            this.focus(name);
        }
    }
    private onExpanderToggled = () => {
        if (this.expander) {
            local.open.value = this.expander.open;
        }
    }

    init(id?: string): void {
        this.id = id;
        if (!id && !this.expander) {
            this.expander = document.querySelector(`details#${id}-expander`);
        }
        if (this.expander) {
            this.expander.open = local.open.value;
            this.expander?.addEventListener('toggle', this.onExpanderToggled);
        }
        if (id && !this.container) {
            this.container = document.getElementById(`${id}-container`);
        }
        if (this.container && !this.map) {
            this.map = new LeafletMap(this.container);
            this.map.setView({
                lat: 47.80030,
                lng: 13.04360,
            }, 6);
        }
        if (this.map) {
            this.map.eachLayer(l => {
                if ((l instanceof Marker) && l.options.title) {
                    this.markers.set(l.options.title, l);
                }
            })
        }
        if (this.map && !this.layer) {
            this.layer = new TileLayer(MAP_PROVIDER, {
                maxZoom: MAP_ZOOM_MAX,
                minZoom: MAP_ZOOM_MIN,
                attribution: MAP_ATTRIBUTION,
            }).addTo(this.map);
        }

        if (this.container && !this.observer) {
            this.observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!this.map || !this.layer) {
                        return;
                    }
                    const isVisible = entry.intersectionRatio > 0;
                    if (isVisible && !this.map.hasLayer(this.layer)) {
                        this.layer.addTo(this.map);
                    } else if (!isVisible && this.map.hasLayer(this.layer)) {
                        this.layer.removeFrom(this.map);
                    }
                });
            });
        }
        this.observer?.observe(this.container!);

        if (!this.gallery) {
            this.gallery = document.querySelector(`#gallery-container`);
        }

        this.update();

        local.open.on(this.onOpenChanged);
        shared.open.on(this.onPhotoChanged);
        shared.filter.on(this.onFilterChanged);
    }
    hmr(old: this): void {
        const any = old.id
            || old.expander
            || old.container
            || old.gallery
            || old.map
            || old.layer
            || old.observer
        if (any) {
            this.expander = old.expander;
            this.container = old.container;
            this.gallery = old.gallery;
            this.map = old.map;
            this.layer = old.layer;
            this.observer = old.observer;
        }
        old[Symbol.dispose]();
        if (any) {
            this.init(old.id);
        }
    }
    [Symbol.dispose](): void {
        shared.filter.off(this.onFilterChanged);
        shared.open.off(this.onPhotoChanged);
        local.open.off(this.onOpenChanged);
        this.observer?.unobserve(this.container!);
    }

    private update(): void {
        if (!this.map) {
            return;
        }

        for (const marker of this.markers.values()) {
            marker.removeFrom(this.map);
        }

        if (!this.gallery) {
            return;
        }

        const group = new FeatureGroup();
        const selected = shared.filter.value;
        for (const anchor of this.gallery.querySelectorAll('a')) {
            const name = anchor.id.startsWith('photo-') ? anchor.id.substring('photo-'.length) : null;
            if (!name) {
                continue;
            }
            const thumb = anchor.querySelector('img');
            if (!thumb) {
                continue;
            }
            const hasGeoTag = anchor.dataset.lng && anchor.dataset.lat;
            if (!hasGeoTag) {
                continue;
            }
            const tags = anchor.dataset['tags']?.split(',');
            const isSelected = !selected
                || selected.length == 0
                || selected.every(t => tags?.includes(t));
            if (!isSelected) {
                continue;
            }
            let marker = this.markers.get(name);
            if (!marker) {
                const lng = parseFloat(anchor.dataset.lng!);
                const lat = parseFloat(anchor.dataset.lat!);
                marker = new Marker({
                    lat,
                    lng,
                }, {
                    title: name,
                });
                const img = document.createElement('img');
                img.src = thumb.src;
                img.onclick = () => shared.open.value = name;
                marker.bindPopup(img);
                this.markers.set(name, marker);
            }
            marker.addTo(this.map);
            group.addLayer(marker);
        }
        if (group.getLayers().length > 0) {
            this.map.flyToBounds(group.getBounds(), { maxZoom: 16, padding: [50, 50] });
        }
    }
    private focus(name: string): void {
        const marker = map.markers.get(name);
        if (marker && map.map?.hasLayer(marker)) {
            map.map.flyTo(marker.getLatLng(), 16);
        }
    }
}

let map = new MapModule();
export default map;

if (import.meta.hot) {
    import.meta.hot.accept((newMod) => {
        if (newMod) {
            const newMap = newMod.default;
            newMap.hmr(map);
            map = newMap;
        }
    });
}
