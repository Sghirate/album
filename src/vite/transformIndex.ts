import domSerializer from 'dom-serializer';
import { Element, Text } from 'domhandler';
import { DefaultHandler, Parser } from 'htmlparser2';
import { Manifest } from '../shared/types';

export default function transformIndex(
    html: string,
    manifest: Manifest,
): string {
    const handler = new DefaultHandler((e, d) => {
    }, null, e => {
        switch (e.attribs.id) {
            case 'tags-container': {
                e.childNodes.length = 0;
                const tags = manifest.tags
                    .map(t => typeof t === 'string' ? { tag: t, count: 0 } : t)
                    .sort((a, b) => b.count - a.count);
                for (const entry of tags) {
                    const tag = entry.tag;
                    const btn = new Element('button', {
                        name: tag,
                        class: 'tag',
                        ['data-loca']: `tag-${tag}`,
                    });
                    btn.childNodes.push(new Text(tag));
                    e.childNodes.push(btn);
                }
            } break;
            case 'gallery-container': {
                let first = true;
                for (const name in manifest.photos) {
                    const photo = manifest.photos[name];
                    const link = new Element('a', {
                        id: `photo-${name}`,
                        href: photo.image.url,
                        target: '_blank',
                        ['data-pswp-width']: `${photo.image.width}`,
                        ['data-pswp-height']: `${photo.image.height}`,
                        ['data-tags']: `${photo.tags.join(',')}`,
                    });
                    if (photo.long && photo.lat) {
                        link.attribs['data-lng'] = `${photo.long}`;
                        link.attribs['data-lat'] = `${photo.lat}`;
                    }
                    const by = photo.meta.creator ?? photo.meta.Artist ?? photo.meta.publisher;
                    if (by) {
                        link.attribs['data-by'] = by;
                    }
                    const copyright = photo.meta.Copyright ?? photo.meta.rights?.value;
                    if (copyright) {
                        link.attribs['data-copyright'] = copyright;
                    }
                    if (photo.meta.title?.value) {
                        link.attribs['data-title'] = photo.meta.title.value;
                    }

                    const img = new Element('img', {
                        id: `img-${name}`,
                        src: photo.thumb.url,
                        width: `${photo.thumb.width}`,
                        height: `${photo.thumb.height}`,
                        alt: name,
                    });
                    if (first) {
                        img.attribs['fetchpriority'] = 'high';
                        first = false;
                    }
                    link.childNodes.push(img);
                    e.childNodes.push(link);
                }
            } break;
        }
    })
    const parser = new Parser(handler);
    parser.parseComplete(html);
    return domSerializer(handler.dom);
}
