import { Module } from "./module";
import shared from './shared';
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

class LocaModule implements Module {
    private id: string | undefined;
    private observer: MutationObserver | undefined;
    private selected: string | null = null;
    private translations: Record<string, string> | null = null;
    private buttons = new Map<string, HTMLButtonElement>();
    private element: HTMLDivElement | null = null;

    private onLanguageChanged = () => {
        this.setLanguage(shared.language.value
            ?? (available.length > 0 ? available[0] : '')
        );
    }
    private onManifestChanged = () => {
        this.updateButtons();
    }
    private onButtonClicked = (e: PointerEvent) => {
        if (!(e.target instanceof HTMLButtonElement) || !e.target.name) {
            return;
        }
        shared.language.value = e.target.name;
    }

    init(id?: string): void {
        this.id = id;
        if (id && !this.element) {
            this.element = document.querySelector('div#loca');
        }
        if (this.element) {
            for (const btn of (this.element.querySelectorAll('button') ?? [])) {
                if (!btn.name) {
                    continue;
                }
                btn.addEventListener('click', this.onButtonClicked);
                this.buttons.set(btn.name, btn);
            }
        }

        this.setLanguage(shared.language.value
            ?? (available.length > 0 ? available[0] : '')
        );

        this.observer = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(n => {
                    if (n instanceof HTMLElement) {
                        this.translate(n);
                    }
                })
            })
        });
        this.observer.observe(document, {
            childList: true,
            subtree: true,
        });

        shared.language.on(this.onLanguageChanged);
        shared.manifest.on(this.onManifestChanged);
    }
    hmr(old: this): void {
        const any = old.id || old.element;
        if (any) {
            this.element = old.element;
        }
        old[Symbol.dispose]();
        if (any) {
            this.init(old.id);
        }
    }
    [Symbol.dispose](): void {
        shared.language.off(this.onLanguageChanged);
        shared.manifest.off(this.onManifestChanged);
        for (const btn of this.buttons.values()) {
            btn.removeEventListener('click', this.onButtonClicked);
        }
        this.buttons.clear();
        this.observer?.disconnect();
    }

    private updateButtons() {
        if (!this.element) {
            return;
        }
        for (const lang of available) {
            let btn = this.buttons.get(lang);
            if (!btn) {
                btn = document.createElement('button');
                btn.name = lang;
                btn.addEventListener('click', this.onButtonClicked);
                btn.value = 'off';
                btn.innerText = lang;
                this.buttons.set(lang, btn);
                this.element.appendChild(btn);
            }
        }
        for (const [lang, btn] of this.buttons) {
            const isAvailable = available.includes(lang)
            btn.hidden = !isAvailable;
            btn.value = isAvailable && lang === this.selected ? 'on' : 'off';
        }
    }
    private translateAll(): boolean {
        let any = false;
        document.querySelectorAll<HTMLElement>('[data-loca]').forEach(e => {
            if (this.translate(e)) {
                any = true;
            }
        });
        return any;
    }
    private translate(element: HTMLElement): boolean {
        const key = element.dataset.loca;
        const hasTranslation = (key !== undefined)
            && (this.translations !== null)
            && (key in this.translations);
        const loca = hasTranslation
            ? this.translations![key]
            : null;
        if (loca) {
            if (!element.dataset.unlocalized) {
                element.dataset.unlocalized = element.innerHTML;
            }
            element.innerHTML = loca;
            return true;
        } else if (element.dataset.unlocalized) {
            element.innerHTML = element.dataset.unlocalized;
        }
        return false;
    }
    private setLanguage(language: string) {
        if (language === this.selected) {
            return false;
        }
        const isAvailable = available.includes(language);
        if (!isAvailable) {
            return false;
        }
        this.selected = language;
        this.updateButtons();
        this.translations = langToJson[language] ?? null;
        this.translateAll();
    }
}

let loca = new LocaModule();
export default loca;

if (import.meta.hot) {
    import.meta.hot.accept((newMod) => {
        if (newMod) {
            const newLoca = newMod.default;
            newLoca.hmr(loca);
            loca = newLoca;
        }
    });
}
