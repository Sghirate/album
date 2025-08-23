import { TagInfo } from "../shared/types";
import { make } from "./dom";
import { Events, makeEvents } from "./events";

type TagsEvents = {
    onSelectionChanged: string[];
}
export type Tags = {
    events: Events<TagsEvents>;
    all: (string | TagInfo)[];
    element: HTMLElement;
    container: HTMLDivElement;
    items: Record<string, HTMLButtonElement>;
    get selected(): string[];
    selectOnly(tag: string): boolean;
    select(tag: string): boolean;
    deselect(tag: string): boolean;
    update(): void;
    initAsync(tags: (string | TagInfo)[]): Promise<void>;
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
const element = make('details', e => {
    e.appendChild(make('summary', e => {
        e.id = 'tags-summary';
        e.innerText = 'Tags';
    }));
    // TODO
});
function display(tag: string): string {
    const info: TagInfo = tags.all.find(t => typeof t !== 'string' && t.tag === tag) as TagInfo;
    // TODO: LOCA!
    return info?.en ?? tag;

}
function updateSummary() {
    const summary = tags.element.querySelector('#tags-summary');
    if (summary) {
        if (selected.length === 0) {
            summary.innerHTML = 'Tags';
        } else if (selected.length < 3) {
            summary.innerHTML = `Tags: ${selected.map(t => display(t)).join(',')}`;
        } else {
            summary.innerHTML = `Tags: ${selected.map(t => display(t)).slice(0, 2).join(',')}...+${selected.length - 2}`
        }
    }
}
function handleChange() {
    save();
    updateSummary();
    tags.events.emit('onSelectionChanged', selected);
}
const tags: Tags = {
    events: makeEvents(),
    all: [],
    element,
    container: make('div', e => {
        e.id = 'tags';
        element.appendChild(e);
    }),
    items: {},
    get selected() {
        return selected;
    },
    selectOnly(tag: string): boolean {
        selected.length = 0;
        selected.push(tag);
        handleChange();
        return true;
    },
    select(tag: string): boolean {
        if (selected.includes(tag)) {
            return false;
        }
        selected.push(tag);
        handleChange();
        return true;
    },
    deselect(tag: string): boolean {
        const idx = selected.indexOf(tag);
        if (idx < 0) {
            return false;
        }
        selected.splice(idx, 1);
        handleChange();
        return true;
    },
    update(): void {
        for (let i = 0; i < tags.all.length; ++i) {
            const tag = tags.all[i];
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
                    e.innerText = display(str);
                    tags.container.appendChild(e);
                });
            }
            const ele = tags.items[str];
            ele.value = selected.includes(str) ? "selected" : "";
        }
        updateSummary();
    },
    async initAsync(manifestTags: (string | TagInfo)[]) {
        tags.all = [...manifestTags];
        const available = tags.all.map(t => typeof t !== 'string' ? t.tag : t);
        load(available);
        tags.events.emit('onSelectionChanged', selected);
        tags.update();
    },
}
export default tags;
