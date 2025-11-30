import { Module } from "./module";
import shared from './shared';
import state from "./state";

const local = state.register({
    open: { key: 't', type: 'bool', location: 'browser' }
});

class TagsModule implements Module {
    private id: string | undefined;
    private items = new Map<string, HTMLButtonElement>();
    private expander: HTMLDetailsElement | null = null;
    private summary: HTMLElement | null = null;
    private container: HTMLElement | null = null;
    private clickCount: number = 0;
    private lastClicked: string | null = null;
    private timeout: ReturnType<typeof setTimeout> | null = null;

    private onFilterChanged = () => {
        this.update();
    }
    private onOpenChanged = () => {
        if (this.expander) {
            this.expander.open = local.open.value;
        }
    }
    private onManifestChanged = () => {
        this.update();
    }
    private onExpanderToggled = () => {
        if (this.expander) {
            local.open.value = this.expander?.open;
        }
    }
    private onTagClicked = (e: PointerEvent) => {
        if (!(e.target instanceof HTMLButtonElement) || !e.target.name) {
            return;
        }
        this.handleClick(e.target.name);
    }

    public init(id?: string) {
        this.id = id;
        // Init expander
        if (id && !this.expander) {
            this.expander = document.querySelector(`details#${id}-expander`);
        }
        if (this.expander) {
            this.expander.open = local.open.value;
            this.expander?.addEventListener('toggle', this.onExpanderToggled);
        }
        // Init tag list
        if (id && !this.summary) {
            this.summary = document.querySelector(`#${id}-summary`);
        }
        if (id && !this.container) {
            this.container = document.getElementById(`${id}-container`);
        }
        for (const btn of (this.container?.querySelectorAll('button') ?? [])) {
            const tag = btn.name;
            if (!tag) {
                continue;
            }
            btn.addEventListener('click', this.onTagClicked);
            this.items.set(tag, btn);
        }
        this.update();

        local.open.on(this.onOpenChanged);
        shared.filter.on(this.onFilterChanged);
        shared.manifest.on(this.onManifestChanged);
    }
    public hmr(old: TagsModule): void {
        const any = old.id || old.expander || old.container || old.summary;
        if (any) {
            this.expander = old.expander;
            this.summary = old.summary;
            this.container = old.container;
        }
        old[Symbol.dispose]();
        if (any) {
            this.init(old.id);
        }
    }
    [Symbol.dispose](): void {
        shared.manifest.off(this.onManifestChanged);
        shared.filter.off(this.onFilterChanged);
        local.open.off(this.onOpenChanged);

        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        for (const btn of this.items.values()) {
            btn.removeEventListener('click', this.onTagClicked);
        }
        this.items.clear();

        if (this.expander) {
            this.expander.removeEventListener('toggle', this.onExpanderToggled);
        }

        this.container = null;
        this.summary = null;
        this.expander = null;
    }

    public selectOnly(tag: string): boolean {
        return shared.filter.set(tag);
    }
    public toggleSelected(tag: string): boolean {
        return shared.filter.has(tag)
            ? shared.filter.del(tag)
            : shared.filter.add(tag);
    }
    public select(tag: string): boolean {
        return shared.filter.add(tag);
    }
    public deselect(tag: string): boolean {
        return shared.filter.del(tag);
    }
    private handleClick(tag: string) {
        if (this.lastClicked && this.lastClicked !== tag) {
            this.performClick();
        }

        this.lastClicked = tag;
        ++this.clickCount;

        if (this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.timeout = setTimeout(() => this.performClick(), 200);
    }
    private performClick() {
        if (this.lastClicked === null) {
            return;
        }
        if (this.clickCount > 1) {
            this.selectOnly(this.lastClicked);
        } else {
            this.toggleSelected(this.lastClicked);
        }
        this.lastClicked = null;
        this.clickCount = 0;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
    private update(): void {
        if (this.container) {
            for (const ele of this.items.values()) {
                const tag = ele.name;
                ele.value = (tag && shared.filter.has(tag)) ? "selected" : "";
            }
        }
        this.updateSummary();
    }
    private updateSummary() {
        if (this.summary) {
            const selected = shared.filter.value;
            const n = selected?.length ?? 0;
            const children: HTMLElement[] = [];
            for (let i = 0; i < n; ++i) {
                if (i >= 2) {
                    const span = document.createElement('span');
                    span.innerText = `...+${n - 2}`
                    children.push(span);
                    break;
                }
                if (i > 0) {
                    const span = document.createElement('span');
                    span.innerText = ',';
                    children.push(span);
                }
                const span = document.createElement('span');
                span.dataset['loca'] = `tag-${selected![i]}`;
                span.innerText = selected![i];
                children.push(span);
            }
            this.summary.replaceChildren(...children);
        }
    }
}

let tags = new TagsModule();
export default tags;

if (import.meta.hot) {
    import.meta.hot.accept((newMod) => {
        if (newMod) {
            const newTags = newMod.default;
            newTags.hmr(tags);
            tags = newTags;
        }
    });
}
