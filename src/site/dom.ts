// Helper for creating DOM elements, with optional initialization logic. Purely 'ergonomic'.
export function make<K extends keyof HTMLElementTagNameMap>(
    type: K,
    init?: (e: HTMLElementTagNameMap[K]) => void,
): HTMLElementTagNameMap[K] {
    const e = document.createElement(type);
    init?.(e);
    return e;
}
