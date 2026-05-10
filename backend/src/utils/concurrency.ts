/**
 * Splits an array into sub-arrays of at most `size` elements.
 * The last sub-array may be smaller if the array length is not evenly divisible.
 *
 * @example
 * chunkArray([1,2,3,4,5], 2) // [[1,2],[3,4],[5]]
 */
export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error(`chunkArray: size must be a positive integer, got ${size}`);
  }

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result;
};

/**
 * Runs an array of async task thunks with at most `limit` tasks running
 * concurrently. Results are returned in the same order as the input tasks.
 *
 * Uses a shared-index worker pattern — no external library required.
 *
 * @param limit      Maximum number of tasks to run simultaneously.
 * @param tasks      Array of zero-argument async functions (thunks).
 * @returns          Promise resolving to an array of results in input order.
 *
 * @example
 * const results = await runWithConcurrency(3, batches.map(b => () => processBatch(b)));
 */
export const runWithConcurrency = async <T>(
  limit: number,
  tasks: Array<() => Promise<T>>,
): Promise<T[]> => {
  if (tasks.length === 0) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  // Each worker grabs the next available task index until all tasks are done.
  const worker = async (): Promise<void> => {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  };

  // Spin up `limit` concurrent workers (or fewer if there are fewer tasks).
  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
};
