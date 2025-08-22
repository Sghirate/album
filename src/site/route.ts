export default interface Route {
    html: string;
    onLoad?: () => void;
    cleanup?: () => void;
}
