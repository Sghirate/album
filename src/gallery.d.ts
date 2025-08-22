/** Virtual module to provide the manifest url. The module content depends on environment:
 * - dev: dynamic rest end point that regenerates the module on request.
 * - prod: static manifest file generated during site build.
 */
declare module 'virtual:gallery:url' {
    const url: string;
    export default url;
}
