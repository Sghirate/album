export function set(flags: number, flag: number): number {
    return flags | flag;
}

export function clear(flags: number, flag: number): number {
    return flags & (~flag);
}

export function has(flags: number, flag: number): boolean {
    return (flags & flag) === flag;
}