/** 
 * Typed event source. Expecteds a mapping types as a generic argument in the form:
 * type ExampleEvents {
 *   firstEventName: number;
 *   secondEventName: string;
 *   ...
 * }
 * The event-name is the things that is used to emit and subscribe to events. The associated type
 * is the event arugment that is communicated when emitting the event.
 */
export interface Events<T> {
    on<K extends keyof T>(event: K, cb: (arg: T[K]) => void): (arg: T[K]) => void;
    off<K extends keyof T>(event: K, cb: (arg: T[K]) => void): void;
    once<K extends keyof T>(event: K, cb: (arg: T[K]) => void): void;
    emit<K extends keyof T>(event: K, arg: T[K]): void;
    clear<K extends keyof T>(event: K): void;
}
/** Create a typed event source */
export function makeEvents<T>(): Events<T> {
    type CB<K extends keyof T> = (arg: T[K]) => void;
    const handlers: { [eventName in keyof T]?: ((arg: T[eventName]) => void)[] } = {}
    const once: { [eventName in keyof T]?: ((arg: T[eventName]) => void)[] } = {}
    return {
        /** Subscribe a callback to an event.
         * @param event Nof the event. Property from the generic argument type.
         * @param cb Callback that should be executed when the event is emitted.
         * @returns The callback instance passed as cb
         */
        on<K extends keyof T>(event: K, cb: CB<K>) {
            if (!handlers[event]) {
                handlers[event] = [cb];
            } else {
                handlers[event].push(cb);
            }
            return cb;
        },
        /** Unregister a callback from an event.
         * @param event Nof the event. Property from the generic argument type.
         * @param cb Callback that should be executed when the event is emitted.
         */
        off<K extends keyof T>(event: K, cb: CB<K>) {
            const idx = handlers[event]?.indexOf(cb) ?? -1;
            if (idx >= 0) {
                handlers[event]?.splice(idx, 1);
            }
        },
        /** Subscribe a callback to an event. The callback will be automatically unsubscribed when the event is emitted.
         * @param event Nof the event. Property from the generic argument type.
         * @param cb Callback that should be executed when the event is emitted.
         * @returns The callback instance passed as cb
         */
        once<K extends keyof T>(event: K, cb: CB<K>) {
            if (!once[event]) {
                once[event] = [cb];
            } else {
                once[event].push(cb);
            }
            return cb;
        },
        /** Emit an event.
         * @param event Nof the event. Property from the generic argument type.
         * @param arg Argument value to pass to callbacks.
         */
        emit<K extends keyof T>(event: K, arg: T[K]): void {
            once[event]?.forEach(h => h(arg));
            delete once[event];
            handlers[event]?.forEach(h => h(arg));
        },
        /** Remove all callbacks registered to an event. Including once-callbacks.
         * @param event Nof the event. Property from the generic argument type.
        */
        clear<K extends keyof T>(event: K) {
            delete once[event];
            delete handlers[event];
        },
    }
}
