import { Events, makeEvents } from "./events";

/** Events emitted bt map.events */
type StateEvents = {
    onParamChanged: string;
}
export type StateModule = {
    /** Event Emitter. */
    events: Events<StateEvents>;
    init(): void;
}
const state: StateModule = {
    events: makeEvents<StateEvents>(),
    init() {
    },
};
export default state;
