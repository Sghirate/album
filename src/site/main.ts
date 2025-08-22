import gallery from './gallery';
import tags from './tags';

// Initialize HTML elements
const app = document.getElementById('app')
if (!app) {
    throw `FATAL: app element not found!`
}
app?.replaceChildren(tags.container, gallery.container)
// Hookup events
tags.events.on('onSelectionChanged', s => gallery.update(s))
// Load data
gallery.initAsync()
    .then(() => tags.initAsync(gallery.manifest))
