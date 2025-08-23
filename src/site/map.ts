import { Map as LeafletMap, Marker, TileLayer } from "leaflet";
import 'leaflet/dist/leaflet.css';
import { make } from "./dom";
import { Events, makeEvents } from "./events";
import { SelectedPhoto } from "./types";

type MapEvents = {
    onRequestOpen: string;
}
export type Map = {
    events: Events<MapEvents>;
    container: HTMLDivElement;
    map: LeafletMap | undefined;
    markers: Record<string, Marker>;
    update(selection: SelectedPhoto[]): void;
    initAsync(): Promise<void>;
}
const map: Map = {
    events: makeEvents(),
    container: make('div', e => {
        e.id = 'map';
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
