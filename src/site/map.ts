import { Map as LeafletMap, Marker, TileLayer } from "leaflet";
import 'leaflet/dist/leaflet.css';
import { make } from "./dom";
import { Events, makeEvents } from "./events";
import { SelectedPhoto } from "./types";

/** Events emitted bt map.events */
type MapEvents = {
    onRequestOpen: string;
}
/** Map module. Wraps around a leaflet map. */
export type Map = {
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
    markers: Record<string, Marker>;
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
    }));
});
const map: Map = {
    events: makeEvents(),
    element,
    container: make('div', e => {
        e.id = 'map';
        element.appendChild(e);
    }),
    map: undefined,
    markers: {},
    update(selection: SelectedPhoto[]) {
        if (!map.map) {
            return;
        }
        for (const name in map.markers) {
            const marker = map.markers[name];
            marker.removeFrom(map.map);
        }
        for (const { name, photo } of selection) {
            if (!photo.lat || !photo.long) {
                // no geo tag!
                continue;
            }
            if (!(name in map.markers)) {
                map.markers[name] = new Marker({
                    lat: photo.lat!,
                    lng: photo.long!,
                }, {
                    title: name,
                });
                const img = make('img', img => {
                    img.src = photo.thumb.url!;
                    img.onclick = () => map.events.emit('onRequestOpen', name);
                });
                map.markers[name].bindPopup(img)
            }
            const marker = map.markers[name];
            marker.addTo(map.map);
        }
    },
    async initAsync() {
        map.map = new LeafletMap(map.container);
        map.map.setView({
            lat: 47.80030,
            lng: 13.04360,
        }, 6);
        new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom: 3,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map.map);
    },
}
export default map;
