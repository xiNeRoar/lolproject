/**
 * Re-export the shared database client for use in bot commands.
 * The bot uses direct Drizzle queries (not the HTTP API) for performance
 * and transactional integrity.
 */
export { db } from "@workspace/db";
export * from "@workspace/db";
