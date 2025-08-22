import { Manifest } from "../shared/types";
import { make } from "./dom";
import { Events, makeEvents } from "./events";

type TagsEvents = {
    onSelectionChanged: string[];
}
export type Tags = {
    events: Events<TagsEvents>;
    manifest: Manifest | undefined;
    container: HTMLDivElement;
    items: Record<string, HTMLButtonElement>;
    get selected(): string[];
    selectOnly(tag: string): boolean;
    select(tag: string): boolean;
    deselect(tag: string): boolean;
    update(): void;
    initAsync(manifest: Manifest | undefined): Promise<void>;
}
const selected: string[] = ['top-rated'];
function load(available: string[]): boolean {
    const str = localStorage.getItem('tags');
    const json = str && JSON.parse(str);
    if (!Array.isArray(json)) {
        return false;
    }
    selected.length = 0;
    selected.push(...json.filter(t => available.includes(t)));
    return true;
}
function save() {
    localStorage.setItem('tags', JSON.stringify(selected));
}
const tags: Tags = {
    events: makeEvents(),
    container: make('div', e => e.id = 'tags'),
    items: {},
    manifest: undefined,
    get selected() {
        return selected;
    },
    selectOnly(tag: string): boolean {
        selected.length = 0;
        selected.push(tag);
        save();
        tags.events.emit('onSelectionChanged', selected);
        return true;
    },
    select(tag: string): boolean {
        if (selected.includes(tag)) {
            return false;
        }
        selected.push(tag);
        save();
        tags.events.emit('onSelectionChanged', selected);
        return true;
    },
    deselect(tag: string): boolean {
        const idx = selected.indexOf(tag);
        if (idx < 0) {
            return false;
        }
        selected.splice(idx, 1);
        save();
        tags.events.emit('onSelectionChanged', selected);
        return true;
    },
    update(): void {
        const defined = this.manifest?.tags ?? [];
        for (let i = 0; i < defined.length; ++i) {
            const tag = defined[i];
            const str = typeof tag === 'string' ? tag : tag.tag;
            if (!(str in tags.items)) {
                tags.items[str] = make('button', e => {
                    e.classList.add('tag');
                    e.id = `tag-${str}`;
                    e.name = str;
                    e.addEventListener('dblclick', (ev) => {
                        ev.stopPropagation();
                        if (tags.selectOnly(str)) {
                            tags.update();
                        }

                    });
                    e.addEventListener('click', () => {
                        const isSelected = (e.value?.length ?? 0) > 0;
                        if (isSelected && tags.deselect(str)) {
                            e.value = "";
                        } else if (!isSelected && tags.select(str)) {
                            e.value = "selected";
                        }
                    });
                    // TODO: LOCA!
                    const en = (typeof tag !== 'string') ? tag.en : undefined;
                    console.log(en);
                    e.innerHTML = en ?? str;
                    tags.container.appendChild(e);
                });
            }
            const ele = tags.items[str];
            ele.value = selected.includes(str) ? "selected" : "";
        }
    },
    async initAsync(manifest: Manifest | undefined) {
        tags.manifest = manifest;
        const available = (manifest?.tags ?? []).map(t => typeof t !== 'string' ? t.tag : t);
        load(available);
        tags.events.emit('onSelectionChanged', selected);
        tags.update();
    },
}
export default tags;
