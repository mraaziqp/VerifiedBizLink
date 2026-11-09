/**
 * The full POS suite again, with every database transaction going through
 * @neondatabase/serverless's WebSocket Pool (the production code path in
 * src/lib/db.ts) instead of node-postgres. Run: npm run test:pos:neon
 */
process.env.POS_TEST_DRIVER = 'neon';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- must load after the env var is set
require('./pos.test');
