export interface Module extends Disposable {
    init(id?: string): void;
    hmr?(old: this): void;
}
