import gallery from './gallery';
import manifest from './manifest';
import map from './map';
import tags from './tags';
import { SelectedPhoto } from './types';

// Initialize HTML elements
const app = document.getElementById('app')
if (!app) {
    throw `FATAL: app element not found!`
}
app?.replaceChildren(
    tags.element,
    map.element,
    gallery.element,
)

function updateSelection(tags: string[]) {
    const selection: SelectedPhoto[] = [];
    for (const name in manifest.photos) {
        const photo = manifest.photos[name];
        if (tags.length > 0 && tags.some(t => !photo.tags.includes(t))) {
            continue;
        }
        selection.push({ name, photo });
    }
    gallery.update(selection)
    map.update(selection);
}
// Load data
async function initAsync() {
    await manifest.initAsync();
    const promises = [
        gallery.initAsync(),
        map.initAsync(),
        tags.initAsync(manifest?.tags ?? []),
    ];
    await Promise.all(promises);
    // Hookup events
    tags.events.on('onSelectionChanged', s => updateSelection(s));
    map.events.on('onRequestOpen', name => gallery.open(name));
    // initial selection
    updateSelection(tags.selected);
}
initAsync();
