import type Route from './route';
// import homeModule from './routes/home';
// import notFoundModule from './routes/notFound';

const modules: Record<string, Route> = {
    // '/': homeModule,
    // '404': notFoundModule,
    '500': { html: '<h1>500</h1><p>Internal Server Error</p>' },
};
let currentModule: Route | null = null;

function renderPage(app: HTMLElement, html: string) {
    app.innerHTML = html;
}

function router(app: HTMLElement, path: string, modules: Record<string, Route>) {
    if (currentModule?.cleanup !== undefined) {
        try {
            currentModule?.cleanup();
        } catch (e) {
            console.error(`Error during cleanup`, e);
        }
    }
    currentModule = modules[path];

    //renderPage(app, currentModule.html);

    if (currentModule.onLoad !== undefined) {
        try {
            currentModule.onLoad();
        } catch (e) {
            console.error(`Error during load`, e);
        }
    }
}

function handleRoute() {
    const app = document.getElementById('app');
    if (app === null || app === undefined) {
        console.error(`Error during initialization. app element not found!`);
        return;
    }
    const path = location.hash.slice(1) || '/';
    router(app, path, modules);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('load', handleRoute);
    window.addEventListener('hashchange', handleRoute);
}
