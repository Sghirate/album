import { Events, makeEvents } from "./events";

export const SharedKeys = {
    Expanded: 'e',
    Tags: 't',
    Open: 'o',
} as const

/** Events emitted bt map.events */
type StateEvents = {
    onParamChanged: string;
}
export type StateModule = {
    /** Event Emitter. */
    events: Events<StateEvents>;
    init(): void;
    push(key: string, value: string): void;
    pop(key: string, value: string): void;
    has(key: string, value?: string): boolean;
    set(key: string, value: string): void;
    get(key: string): string;
}
const state: StateModule = {
    events: makeEvents<StateEvents>(),
    init() {
    },
    push(key: string, value: string) {
        
    },
    pop(key: string, value: string) {

    },
    has(key: string, value?: string): boolean {
        return false;
    },
    set(key: string, value: string) {

    },
    get(key: string): string|null {
        return null;
    }
};
export default state;
