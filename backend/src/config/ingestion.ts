/**
 * Number of chunks to include in a single HuggingFace embedding API call.
 * Smaller values reduce per-call latency and risk of rate-limiting;
 * larger values reduce the number of round-trips.
 *
 * Tunable via the EMBED_BATCH_SIZE environment variable.
 * Default: 20
 */
export const EMBED_BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE) || 20;

/**
 * Maximum number of embed+upsert batch operations that may be
 * in-flight simultaneously.
 *
 * On the HuggingFace free tier keep this at 3 or lower.
 * On a paid tier you can safely raise it to 5–8.
 *
 * Tunable via the CONCURRENCY_LIMIT environment variable.
 * Default: 3
 */
export const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY_LIMIT) || 3;
