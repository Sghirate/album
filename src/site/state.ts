import { Module } from "./module";

export type StateSpecLiteral = 'bool' | 'string' | 'strings';
export type StateStorage = 'url' | 'browser';
type CB = (key: string) => void;
function stringFromParams(params: URLSearchParams) {
    return params.size > 0 ? `?${params.toString()}` : '/';
}
abstract class StateEntry {
    protected key: string;
    protected callbacks = new Set<CB>();
    public readonly location?: StateStorage;
    public get type(): StateSpecLiteral | undefined { return undefined; }

    protected constructor(key: string, location?: StateStorage) {
        this.key = key;
        this.location = location;
    }
    public on(cb: CB) {
        this.callbacks.add(cb);
    }
    public off(cb: CB) {
        this.callbacks.delete(cb);
    }
    protected notify() {
        this.callbacks.forEach(cb => cb(this.key));
    }
    protected save() {
        const v = this.get();
        switch (this.location) {
            case 'browser': {
                if (v === undefined && localStorage.get) {
                    localStorage.removeItem(this.key);
                } else {
                    localStorage.setItem(this.key, JSON.stringify(v));
                }
            } break;
            case 'url': {
                const params = new URLSearchParams(document.location.search);
                if (this.toUrl(params, v)) {
                    window.history.pushState(null, '', stringFromParams(params));
                }
            } break;
        }
    }
    public abstract matches(spec: StateSpecItem): boolean;
    public clear(): void {
        if (this.apply(undefined)) {
            this.save();
            this.notify();
        }
    }
    protected abstract fromUrl(params: URLSearchParams): any;
    protected abstract toUrl(params: URLSearchParams, value: any): boolean;
    protected abstract get(): any;
    protected abstract apply(value: any): boolean;
    public init(storage?: Storage, params?: URLSearchParams): boolean {
        let success = false;
        if (storage) {
            const stored = localStorage.getItem(this.key);
            const parsed = stored ? JSON.parse(stored) : undefined;
            success = this.apply(parsed);
        } else if (params) {
            const stateValue = this.fromUrl(params);
            success = this.apply(stateValue);
        }
        if (success) {
            this.notify();
        }
        return success;
    }
    public load(storage?: Storage, params?: URLSearchParams): boolean {
        let success = false;
        if (storage) {
            const stored = localStorage.getItem(this.key);
            const parsed = stored ? JSON.parse(stored) : undefined;
            success = this.apply(parsed);
        } else if (params) {
            const stateValue = this.fromUrl(params);
            success = this.apply(stateValue);
        }
        if (success) {
            this.notify();
        }
        return success;
    }
}
class StateBool extends StateEntry {
    public readonly defaultValue?: boolean;
    private _value?: boolean;
    public get value(): boolean {
        return this._value ?? this.defaultValue ?? false;
    }
    public set value(value: boolean) {
        if (this._value === value) {
            return;
        }
        this._value = value;
        this.save();
        this.notify();
    }
    public get type(): StateSpecLiteral | undefined { return 'bool'; }

    public constructor(key: string, spec?: StateSpecBool) {
        super(key, spec?.location);
        this.defaultValue = spec?.default;
    }
    protected override fromUrl(params: URLSearchParams): any {
        const str = params.get(this.key);
        return str === null ? undefined
            : str === '0' ? false
                : true;
    }
    protected override toUrl(params: URLSearchParams, value: any): boolean {
        const desired = value === true ? '1'
            : value === false ? '0'
                : null;
        if (desired !== params.get(this.key)) {
            params.set(this.key, value);
            return true;
        }
        return false;
    }
    protected get() {
        return this._value;
    }
    protected apply(value: any): boolean {
        if (value === undefined) {
            if (this._value !== undefined) {
                this._value = undefined;
                return true;
            }
        } else if (typeof value === 'boolean') {
            if (this._value !== value) {
                this._value = value;
                return true;
            }
        }
        return false;
    }
    public override matches(spec: StateSpecItem): boolean {
        const kind = typeof spec === 'string' ? spec : spec.type;
        const location = typeof spec === 'string' ? undefined : spec.location;
        const defaultValue = typeof spec === 'string' ? undefined : spec.default;
        return kind === 'bool'
            && this.location === location
            && this.defaultValue === defaultValue;
    }
}
class StateString extends StateEntry {
    public readonly defaultValue?: string;
    private _value?: string;
    public get value(): string {
        return this._value ?? this.defaultValue ?? '';
    }
    public set value(value: string) {
        if (this._value === value) {
            return;
        }
        this._value = value;
        this.save();
        this.notify();
    }
    public get type(): StateSpecLiteral | undefined { return 'string'; }

    public constructor(key: string, spec?: StateSpecString) {
        super(key, spec?.location);
        this.defaultValue = spec?.default;
    }
    protected override fromUrl(params: URLSearchParams): any {
        const str = params.get(this.key);
        return str === null ? undefined : str;
    }
    protected override toUrl(params: URLSearchParams, value: any): boolean {
        const desired = ((typeof value === 'string') && value.length > 0)
            ? value
            : null;
        if (desired === null && params.has(this.key)) {
            params.delete(this.key);
            return true;
        } else if (desired !== null && params.get(this.key) !== desired) {
            params.set(this.key, desired);
            return true;
        }
        return false;
    }
    protected get() {
        return this._value;
    }
    protected apply(value: any): boolean {
        if (value === undefined) {
            if (this._value !== undefined) {
                this._value = undefined;
                return true;
            }
        } else if (typeof value === 'string') {
            if (this._value !== value) {
                this._value = value;
                return true;
            }
        }
        return false;
    }
    public override matches(spec: StateSpecItem): boolean {
        const kind = typeof spec === 'string' ? spec : spec.type;
        const location = typeof spec === 'string' ? undefined : spec.location;
        const defaultValue = typeof spec === 'string' ? undefined : spec.default;
        return kind === 'string'
            && this.location === location
            && this.defaultValue === defaultValue;
    }
}
class StateStrings extends StateEntry {
    public readonly defaultValue?: string[];
    private _value?: string[] | null;
    public get value(): string[] | null {
        return this._value ?? this.defaultValue ?? [];
    }
    public set value(value: string[] | null) {
        if (this._value === value) {
            return;
        }
        this._value = value;
        this.save();
        this.notify();
    }
    public get type(): StateSpecLiteral | undefined { return 'strings'; }

    public constructor(key: string, spec?: StateSpecStrings) {
        super(key, spec?.location);
        this.defaultValue = spec?.default;
    }
    protected override fromUrl(params: URLSearchParams): any {
        const str = params.get(this.key);
        return str === null ? undefined : str.split(',');
    }
    protected override toUrl(params: URLSearchParams, value: any): boolean {
        const desired = (Array.isArray(value) && value.length > 0)
            ? value.join(',')
            : undefined;
        const str = params.get(this.key);
        if (desired === undefined && params.has(this.key)) {
            params.delete(this.key);
            return false;
        } else if (desired !== undefined && desired !== str) {
            params.set(this.key, desired);
            return true;
        }
        return false;
    }
    protected get() {
        return this._value;
    }
    protected apply(value: any): boolean {
        if (value === undefined) {
            if (this._value !== undefined) {
                this._value = undefined;
                return true;
            }
        }
        const arr = Array.isArray(value) ? value
            : typeof value === 'string' ? value.split(',')
                : [];
        if (this.value?.length !== arr.length
            || arr.some(v => !this._value?.includes(v))
        ) {
            this._value = value;
            return true;
        }
        return false;
    }
    public override matches(spec: StateSpecItem): boolean {
        const kind = typeof spec === 'string' ? spec : spec.type;
        const location = typeof spec === 'string' ? undefined : spec.location;
        const defaultValue = typeof spec === 'string' ? undefined : spec.default;
        return kind === 'strings'
            && this.location === location
            && this.defaultValue === defaultValue;
    }
    public override clear(): void {
        if (this._value !== undefined) {
            this._value = undefined;
            this.notify();
            this.save();
        }
    }
    public has(v: string): boolean {
        return (this.value?.indexOf(v) ?? -1) >= 0;
    }
    public set(v: string): boolean {
        if (this.value?.length === 1 && this.value[0] === v) {
            return false;
        }
        this._value = [v];
        this.notify();
        this.save();
        return true;
    }
    public add(v: string): boolean {
        if (!this._value) {
            this.value = [v];
            return true;
        } else {
            const idx = this._value.indexOf(v) ?? -1;
            if (idx < 0) {
                this._value.push(v);
                this.notify();
                this.save();
                return true;
            }
        }
        return false;
    }
    public del(v: string): boolean {
        if (!this._value) {
            const idx = this.defaultValue?.indexOf(v) ?? -1;
            if (idx >= 0) {
                this.value = [...this.defaultValue!].splice(idx, 1);
                return true;
            }
        } else {
            const idx = this._value.indexOf(v) ?? -1;
            if (idx >= 0) {
                this._value.splice(idx, 1);
                this.notify();
                this.save();
                return true;
            }
        }
        return false;
    }
}
export type SpecLiteralToEntry<L extends StateSpecLiteral> =
    L extends 'bool' ? StateBool :
    L extends 'string' ? StateString :
    L extends 'strings' ? StateStrings :
    never;
export type StateSpecShared = {
    key?: string;
    location?: StateStorage;
}
export type StateSpecBool = StateSpecShared & {
    type: 'bool';
    default?: boolean;
}
export type StateSpecString = StateSpecShared & {
    type: 'string';
    default?: string;
}
export type StateSpecStrings = StateSpecShared & {
    type: 'strings';
    default?: string[];
}
export type StateSpecItem = StateSpecLiteral | StateSpecBool | StateSpecString | StateSpecStrings;
export type StateSpec = Record<string, StateSpecItem>;
export type StateFromSpec<S extends StateSpec> = {
    [K in keyof S]:
    S[K] extends StateSpecLiteral
    ? SpecLiteralToEntry<S[K]>
    : S[K] extends { type: infer L extends StateSpecLiteral }
    ? SpecLiteralToEntry<L>
    : never;
};
export type StateInstance<S extends StateSpec> = StateFromSpec<S>;

class StateModule implements Module {
    private id: string | undefined;
    private registry = new Map<string, StateEntry>();

    private onStorageChanged = (e: StorageEvent) => {
        const entry = e.key !== null ? this.registry.get(e.key) : undefined;
        if (entry?.location === 'browser') {
            entry.load();
        }
    }
    private onStateChanged = (e: PopStateEvent) => {
        const params = new URLSearchParams(document.location.search);
        for (const [key, state] of this.registry) {
            if (state.location !== 'url') {
                continue;
            }
            state.load(undefined, params);
        }
    }

    init(id?: string): void {
        this.id = id ?? `${performance.now()}`;
        window.addEventListener('storage', this.onStorageChanged);
        window.addEventListener('popstate', this.onStateChanged);
        const storage = localStorage;
        const params = new URLSearchParams(document.location.search);
        let anyState = window.history.state === null;
        for (const [key, state] of this.registry) {
            const changed = state.init(
                state.location === 'browser' ? storage : undefined,
                state.location === 'url' ? params : undefined,
            );
            anyState ||= changed;
        }
        if (anyState) {
            window.history.replaceState(null, '', stringFromParams(params));
        }
    }
    hmr(old: this): void {
        if (old.id) {
            for (const [key, state] of old.registry) {
                if (!this.registry.has(key)) {
                    this.registry.set(key, state);
                }
            }
            this.init();
        }
        old[Symbol.dispose]();
    }
    [Symbol.dispose](): void {
        window.removeEventListener('popstate', this.onStateChanged);
        window.removeEventListener('storage', this.onStorageChanged);
        this.registry.clear();
    }

    public register<S extends StateSpec>(state: S): StateInstance<S> {
        function castItem(item: StateSpecItem): StateSpecBool | StateSpecString | StateSpecStrings {
            if (typeof item === 'string') {
                return { type: item };
            }
            switch (item.type) {
                case 'bool': return item as StateSpecBool;
                case 'string': return item as StateSpecString;
                case 'strings': return item as StateSpecStrings;
            }
        }
        const entries: Record<string, StateEntry> = {};
        for (const name in state) {
            const raw = state[name];
            const spec = castItem(raw);
            const key = spec.key ?? name;
            let entry = this.registry.get(key);
            if (entry) {
                if (!entry.matches(raw)) {
                    throw `Spec mismatch: ${JSON.stringify(entry)} != ${JSON.stringify(raw)}. Reload page!`;
                }
                entries[name] = entry;
                continue;
            } else {
                switch (spec.type) {
                    case 'bool': {
                        entry = new StateBool(key, spec);
                    } break;
                    case 'string': {
                        entry = new StateString(key, spec);
                    } break;
                    case 'strings': {
                        entry = new StateStrings(key, spec);
                    } break;
                }
                if (!entry) {
                    throw `Invalid state type: ${spec.type}`;
                }
                entries[name] = entry;
                this.registry.set(key, entry);
            }
        }
        return {
            ...entries
        } as StateInstance<S>;
    }
}
let state = new StateModule();
export default state;
