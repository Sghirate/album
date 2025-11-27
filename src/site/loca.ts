import { make } from "./dom";
import { Events, makeEvents } from "./events";
import classes from './loca.module.css';
const locaJson = import.meta.glob('./loca/*.json', {
    import: 'default',
    eager: true,
});
const langToJson = Object.entries(locaJson).reduce((r, e) => {
    const path = e[0];
    const lang = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.json'));
    const url = e[1] as string;
    r[lang] = url;
    return r;
}, {} as Record<string, any>);
const available: string[] = Object.keys(langToJson);

let selected: string | null = null;
let translations: any | null = null;
function setLang(lang: string): boolean {
    if (lang === selected) {
        return true;
    }
    if (!available.includes(lang)) {
        return false;
    }
    selected = lang;
    updateButtons();
    translations = langToJson[lang] ?? null;
    translateAll();
    return true;
}
function translateAll(): boolean {
    let any = false;
    document.querySelectorAll<HTMLElement>('[data-loca]').forEach(e => {
        if (translate(e)) {
            any = true;
        }
    });
    return any;
}
function translate(e: HTMLElement): boolean {
    const key = e.dataset.loca;
    const loca = ((key !== undefined) && (translations !== null) && (key in translations))
        ? translations[key]
        : null;
    if (loca) {
        if (!e.dataset.unlocalized) {
            e.dataset.unlocalized = e.innerHTML;
        }
        e.innerHTML = loca;
        return true;
    } else if (e.dataset.unlocalized) {
        e.innerHTML = e.dataset.unlocalized;
    }
    return false;
}
function updateButtons() {
    loca?.buttons?.forEach((btn, lang) => {
        btn.value = lang === selected ? 'on' : 'off';
    });
}

let observer: MutationObserver|null = null;

/** Events emitted by loca.events. */
type LocaEvents = {
    onLanguageChanged: string;
}
type LocaModule = {
    /** Event Emitter. */
    events: Events<LocaEvents>;
    /** Root element for the language switcher. Will be added to the app */
    element: HTMLElement;
    /** Language buttons. Mapping of language short name (2 letter iso code) to button. */
    buttons: Map<string, HTMLButtonElement>;
    /** Currently selected language. */
    get selected(): string | null;
    /** Initialize localization. Will append the given set of languages and try to select the 'initial language'.
     * The initial language is determined by a previous selection or the browser default.
     * If no initial language could be determined or it is not supported it will fall back to english.
     * If english is not available it will fall back to the first language from the loca folder.
     */
    initAsync(languages: string[]): Promise<void>;
    /** Change language. Will also store the new selected language in the localStorage for the next visit. */
    switchLanguage(lang: string): boolean;
};
const element = make('div', e => {
    e.id = 'loca';
    e.className = classes.loca;
});
const loca: LocaModule = {
    events: makeEvents<LocaEvents>(),
    element,
    buttons: new Map<string, HTMLButtonElement>(),
    get selected(): string | null {
        return selected;
    },
    async initAsync(languages: string[]) {
        languages.forEach(l => {
            if (!available.includes(l)) {
                available.push(l);
            }
        });
        available.forEach(l => {
            const btn = make('button', e => {
                e.className = classes.lang;
                e.onclick = () => loca?.switchLanguage(l);
                e.value = 'off';
                e.innerText = l;
            });
            loca.buttons.set(l, btn);
            loca.element.appendChild(btn);
        });

        const initialLanguage = localStorage.getItem('lang')
            || (navigator as any)?.language
            || (navigator as any)?.userLanguage
            || 'en-US';
        setLang(initialLanguage.split('-')[0])
            || setLang('en')
            || setLang(available[0]);

        // Register observer to automatically localize newly added html elements:
        // TODO: consider optimizing this a bit.
        observer = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(n => {
                    if (n instanceof HTMLElement) {
                        translate(n);
                    }
                })
            })
        });
        observer.observe(document, {
            childList: true,
            subtree: true,
        });
    },
    switchLanguage(lang: string): boolean {
        const success = setLang(lang);
        if (success) {
            loca.events.emit('onLanguageChanged', lang);
            localStorage.setItem('lang', lang);
        }
        return success;
    },
};
export default loca;
