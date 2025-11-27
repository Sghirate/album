import Binary from "../shared/binary";
import { TagInfo, TagLoca } from "../shared/types";
import { make } from "./dom";
import { Events, makeEvents } from "./events";

//#region Loca
let availableTagLoca: TagLoca = {};
let selectedTagLang: string | null = null;
let tagTranslations: string[] | null = [];
function translateAllTags() {
    tags?.items?.forEach((btn, tag) => btn.innerText = display(tag));
}
async function setLangAsync(lang: string) {
    selectedTagLang = lang;
    let translations: string[] | null = null;
    if (lang in availableTagLoca) {
        const res = await fetch(availableTagLoca[lang]);
        const buf = await res.arrayBuffer();
        translations = new Binary(buf).readTagLoca();
    }
    if (selectedTagLang !== lang) {
        return;
    }
    tagTranslations = translations;
    translateAllTags();
    updateSummary();
}
//#endregion Loca

/** Events emitted by tags.events */
type TagsEvents = {
    onSelectionChanged: string[];
}
export type TagsModule = {
    /** Event emitter. */
    events: Events<TagsEvents>;
    /** Set of all available tags. Taken from the manifest. */
    all: (string | TagInfo)[];
    /** Root element for the tag selection. */
    element: HTMLElement;
    /** Container element housing the tag buttons. */
    container: HTMLDivElement;
    /** Mapping of tag -> photo. The tag string is the short name of the tag, not localized. Taken from the manifest.
     */
    items: Map<string, HTMLButtonElement>;
    /** Actively selected tags. */
    get selected(): string[];
    /** Exclusive tag selection. Deselects all other tags.
     * @param tag short name of the tag. Taken from the manifest.
     */
    selectOnly(tag: string): boolean;
    /** Select a given tag. 
     * @param tag short name of the tag. Taken from the manifest.
    */
    select(tag: string): boolean;
    /** Deselect a given tag. 
     * @param tag short name of the tag. Taken from the manifest.
    */
    deselect(tag: string): boolean;
    /** Update the dom elements of the tag selection. */
    update(): void;
    /** Called when the UI language changes. Should update the tags with the localized version. */
    updateLanguage(lang: string): void;
    /** Initialize the tag selectn. Seeds the list of available tags and loads the
     * previously selected tag from the browsers localStorage.
     * @param tags Available tags from the manifest.
     */
    initAsync(tags: (string | TagInfo)[], tagLoca?: TagLoca): Promise<void>;
}
/** Backing storage. */
const selected: string[] = ['top-rated'];
/** Read selected tasg from localSotrage. Will only load tags that were found in the manifest, other tags are ignored. */
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
/** Save selected tag array to localStorage. */
function save() {
    localStorage.setItem('tags', JSON.stringify(selected));
}
const element = make('details', e => {
    e.appendChild(make('summary', e => {
        e.appendChild(make('span', e => {
            e.id = 'tags-title';
            e.innerText = 'Tags';
            e.dataset.loca = 'tags';
        }));
        e.appendChild(make('span', e => {
            e.id = 'tags-summary';
            e.innerText = '';
        }));
    }));
    // TODO
});
/** Get the display string for a tag. */
function display(tag: string): string {
    const idx = tags?.all?.indexOf(tag) ?? -1;
    const loca = idx >= 0 ? (tagTranslations?.at(idx) ?? null) : null;
    return loca || tag;
}
/** Update the summary of selected tags. */
function updateSummary() {
    const summary = tags.element.querySelector('#tags-summary');
    if (summary) {
        if (selected.length === 0) {
            summary.innerHTML = '';
        } else if (selected.length < 3) {
            summary.innerHTML = `: ${selected.map(t => display(t)).join(',')}`;
        } else {
            summary.innerHTML = `: ${selected.map(t => display(t)).slice(0, 2).join(',')}...+${selected.length - 2}`
        }
    }
}
/** Sync tag state. Writes the selected tags to localStorage, updates the DOM and emits the onSelectionChanged event. */
function handleChange() {
    save();
    updateSummary();
    tags.events.emit('onSelectionChanged', selected);
}
const tags: TagsModule = {
    events: makeEvents(),
    all: [],
    element,
    container: make('div', e => {
        e.id = 'tags';
        element.appendChild(e);
    }),
    items: new Map<string, HTMLButtonElement>(),
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
            let ele = tags.items.get(str);
            if (!ele) {
                ele = make('button', e => {
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
                tags.items.set(str, ele);
            }
            ele.value = selected.includes(str) ? "selected" : "";
        }
        updateSummary();
    },
    updateLanguage(lang: string) {
        setLangAsync(lang);
    },
    async initAsync(manifestTags: (string | TagInfo)[], tagLoca?: TagLoca) {
        availableTagLoca = tagLoca ?? {};
        tags.all = [...manifestTags];
        const available = tags.all.map(t => typeof t !== 'string' ? t.tag : t);
        load(available);
        tags.events.emit('onSelectionChanged', selected);
        tags.update();
    },
}
export default tags;
