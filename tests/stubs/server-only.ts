/**
 * Test stub for the `server-only` package.
 *
 * `server-only` resolves to a module that throws unless Node runs with the
 * `react-server` export condition — which also swaps in the RSC build of React
 * that @react-pdf/renderer can't use. Stubbing it lets the integration tests
 * import the server-side data layer directly.
 *
 * It only marks a module as server-side; there is no behaviour to reproduce.
 */
export {};
