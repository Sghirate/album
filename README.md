# Album

This is the code I use to generate my personal photo album. Mainly hosted here to time-capsule it.

Feel free to use it as an inspiration and salvage any parts of the code that are useful to you.

Important: this is not intended as customizable a general purpose solution. Bug reports and feature requests will be ignored!

Without changing the vite.config.ts the generation will depend on 2 env vars:
```
GALLERY_DIR=/some/directory/containing/tagged/photos/
```

## How it works
* [Vite](https://vite.dev/) server:
  * Load photos and metadata via [exifr](https://github.com/MikeKovarik/exifr) from a gallery directory.
  * Generate output image and thumbnail per photo using [sharp](https://sharp.pixelplumbing.com/). Resizing and changing format if necessary.
  * Generate gallery manifest for a statically build website.
* Client side website, using:
  * [Photoswipe](https://photoswipe.com/) to display the gallery and scroll through it.
  * [Leaflet](https://leafletjs.com/) to show geo-tagged photos on a worldmap.
  * Style based on [The Monospace Web](https://owickstrom.github.io/the-monospace-web/) by [Oskar Wickström](https://wickstrom.tech/)

## What is missing
* Image-Info overlay in the gallery, with links to external websites (for example AllTrails).

## Where is the output

[The AlpBum](https://album.parot.at/)
