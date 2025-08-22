import { Manifest } from "../shared/types";
import { Events, makeEvents } from "./events";
import url from 'virtual:gallery:url';

type ManifestEvents = {
    onLoaded: Manifest;
    onError: Error | string;
}
const manifest: Manifest & {
    events: Events<ManifestEvents>;
    initAsync(): Promise<void>;
} = {
    tags: [],
    photos: {},
    events: makeEvents(),
    async initAsync() {
        try {
            const res = await fetch(url);
            const json = await res.json() as Partial<Manifest>;
            manifest.tags = json.tags ?? [];
            manifest.photos = json.photos ?? {};
            manifest.events.emit('onLoaded', manifest);
        } catch (e) {
            const err = ((e instanceof Error) || typeof e === 'string') ? e : 'Unknown Error';
            manifest.events.emit('onError', err);
        }
    }
}
export default manifest;
