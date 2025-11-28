import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { Icon, Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { make } from "./dom";
import { Events, makeEvents } from "./events";
import { SelectedPhoto } from "./types";

if (import.meta.env.PROD) {
    Icon.Default.prototype.options.iconUrl = markerIconUrl;
    Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
    Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
    Icon.prototype.options.iconUrl = markerIconUrl;
    Icon.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
    Icon.prototype.options.shadowUrl = markerShadowUrl;
}

/** Events emitted by map.events */
type MapEvents = {
    onRequestOpen: string;
}
/** Map module. Wraps around a leaflet map. */
export type MapModule = {
    /** Event Emitter. */
    events: Events<MapEvents>;
    /** Root element for the map. Will be added to the app */
    element: HTMLElement;
    /** Container element for the map. The element that will be controlled by leaflet. */
    container: HTMLDivElement;
    /** Leafelet map instance. */
    map: LeafletMap | undefined;
    /** Map markers. Mapping of photo name (as it appears in the manifest) to Marker instance.
     * Markers will be created the first time they are requested to be displayed. Afterwards they
     * are kept around, however not added to the map if they are currently not selected for display.
     */
    markers: Map<string, Marker>;
    /** Update the map based on a set of selected photos.
     * Will update which markers are visible on the map - however does not performa any kind of re-framing/zooming.
     */
    update(selection: SelectedPhoto[]): void;
    /** Initialize the map module. Sets up leaflet with a default location and the openstreetmap later.
     * The module element can already used before calling initializeAsync.
     */
    initAsync(): Promise<void>;
}
const element = make('details', e => {
    e.appendChild(make('summary', s => {
        s.innerText = 'Map';
        s.dataset.loca = 'map';
    }));
});
const map: MapModule = {
    events: makeEvents(),
    element,
    container: make('div', e => {
        e.id = 'map';
        element.appendChild(e);
    }),
    map: undefined,
    markers: new Map<string, Marker>(),
    update(selection: SelectedPhoto[]) {
        if (!map.map) {
            return;
        }
        map.markers.forEach(m => m.removeFrom(map.map!));
        for (const { name, photo } of selection) {
            if (!photo.lat || !photo.long) {
                // no geo tag!
                continue;
            }
            let marker = map.markers.get(name);
            if (!marker) {
                marker = new Marker({
                    lat: photo.lat!,
                    lng: photo.long!,
                }, {
                    title: name,
                });
                const img = make('img', img => {
                    img.src = photo.thumb.url!;
                    img.onclick = () => map.events.emit('onRequestOpen', name);
                });
                marker.bindPopup(img);
                map.markers.set(name, marker);
            }
            marker.addTo(map.map);
        }
    },
    async initAsync() {
        map.map = new LeafletMap(map.container);
        map.map.setView({
            lat: 47.80030,
            lng: 13.04360,
        }, 6);
        new TileLayer(MAP_PROVIDER, {
            maxZoom: MAP_ZOOM_MAX,
            minZoom: MAP_ZOOM_MIN,
            attribution: MAP_ATTRIBUTION,
        }).addTo(map.map);
    },
}
export default map;
