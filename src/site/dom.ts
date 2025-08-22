export function make<K extends keyof HTMLElementTagNameMap>(
    type: K,
    init?: (e: HTMLElementTagNameMap[K]) => void,
): HTMLElementTagNameMap[K] {
    const e = document.createElement(type);
    init?.(e);
    return e;
}
