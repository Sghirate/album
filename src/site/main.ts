import gallery from './gallery';
import manifest from './manifest';
import map from './map';
import tags from './tags';
import loca from './loca';
import { SelectedPhoto } from './types';

/** Initialize HTML elements - fail outright if the root app-element does not exist. */
const app = document.getElementById('app')
if (!app) {
    throw `FATAL: app element not found!`
}
/** Add the module-elements to the app root. */
app?.replaceChildren(
    loca.element,
    tags.element,
    map.element,
    gallery.element,
)
/** Find currently selected photos in the manifest and communicate the selection to the different modules. */
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
/** Initialize the app. */
async function initAsync() {
    /** Stream in the manifest. */
    await manifest.initAsync();
    /** Initialize the app modules (gallery, map, tags) once the manifest data is present. */
    const promises = [
        loca.initAsync(manifest.languages),
        gallery.initAsync(),
        map.initAsync(),
        tags.initAsync(manifest?.tags ?? [], manifest.tagLoca),
    ];
    await Promise.all(promises);
    /** Hook up events. */
    tags.events.on('onSelectionChanged', s => updateSelection(s));
    map.events.on('onRequestOpen', name => gallery.open(name));
    loca.events.on('onLanguageChanged', l => tags.updateLanguage(l));
    gallery.events.on('onPhotoChanged', p => { if (p !== null) { map.focus(p) } });
    /** Initialized tag localization */
    tags.updateLanguage(loca.selected ?? '');
    /** Initial selection. */
    updateSelection(tags.selected);
}
initAsync();
