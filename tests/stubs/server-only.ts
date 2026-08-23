/**
 * Test stub for the `server-only` package.
 *
 * `server-only` resolves to a module that throws unless Node is run with the
 * `react-server` export condition — but that condition also swaps React for the
 * RSC build, which @react-pdf/renderer cannot use. Stubbing it here lets the
 * tests execute server modules and render a real PDF at the same time.
 *
 * It only marks a module as server-side; there is no behaviour to reproduce.
 */
export {};
