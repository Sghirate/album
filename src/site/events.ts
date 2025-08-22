export interface Events<T> {
    on<K extends keyof T>(event: K, cb: (arg: T[K]) => void): (arg: T[K]) => void;
    off<K extends keyof T>(event: K, cb: (arg: T[K]) => void): void;
    once<K extends keyof T>(event: K, cb: (arg: T[K]) => void): void;
    emit<K extends keyof T>(event: K, arg: T[K]): void;
    clear<K extends keyof T>(event: K): void;
}
export function makeEvents<T>(): Events<T> {
    type CB<K extends keyof T> = (arg: T[K]) => void;
    const handlers: { [eventName in keyof T]?: ((arg: T[eventName]) => void)[] } = {}
    const once: { [eventName in keyof T]?: ((arg: T[eventName]) => void)[] } = {}
    return {
        on<K extends keyof T>(event: K, cb: CB<K>) {
            if (!handlers[event]) {
                handlers[event] = [cb];
            } else {
                handlers[event].push(cb);
            }
            return cb;
        },
        off<K extends keyof T>(event: K, cb: CB<K>) {
            const idx = handlers[event]?.indexOf(cb) ?? -1;
            if (idx >= 0) {
                handlers[event]?.splice(idx, 1);
            }
        },
        once<K extends keyof T>(event: K, cb: CB<K>) {
            if (!once[event]) {
                once[event] = [cb];
            } else {
                once[event].push(cb);
            }
            return cb;
        },
        emit<K extends keyof T>(event: K, arg: T[K]): void {
            once[event]?.forEach(h => h(arg));
            delete once[event];
            handlers[event]?.forEach(h => h(arg));
        },
        clear<K extends keyof T>(event: K) {
            delete once[event];
            delete handlers[event];
        },
    }
}
