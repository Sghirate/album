import state from "./state";

const defaultLanguage: string = (
    (navigator as any)?.language
    ?? (navigator as any)?.userLanguage
    ?? 'en-US'
).split('-')[0];
const shared = state.register({
    filter: {
        key: 'f',
        type: 'strings',
        location: 'url',
    },
    open: {
        key: 'o',
        type: 'string',
        location: 'url',
    },
    language: {
        key: 'l',
        type: 'string',
        location: 'browser',
        default: defaultLanguage,
    },
    manifest: 'string',
});
export default shared;
