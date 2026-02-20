import { getRedis } from "../redis/client";
import { buildConflictError } from "../utils/errors";

/**
 * Acquires a lock for a resource and date.
 * Returns void if successful, otherwise throws a conflict error.
 */
export const acquireLock = async (lockKey: string, holder: string, ttlMs: number): Promise<void> => {
    const redis = await getRedis(); // get the redis client
    const key = `lock:${lockKey}`; // generate a lock key for the resource and date
    const lockValue = holder; // set the lock value to the holder
  
    const claimed = await redis.set(key, lockValue, { NX: true, PX: ttlMs }); // set the lock for the resource and date by the holder
    if (claimed) { // if the lock is claimed, return void ( means the lock is acquired)
      return;
    }
  
    throw buildConflictError( // throw a conflict error ( this means another request with this lock key is in progress)
      `Resource ${lockKey.replace(':', ' on ')} is currently being booked by another user`,
      'RESOURCE_LOCKED'
    );
  };

  /**
   * Releases a lock for a resource and date.
   * Returns void if successful, otherwise throws a conflict error.
   */
  export const releaseLock = async (lockKey: string, holder: string): Promise<void> => {
    const redis = await getRedis(); // get the redis client
    const key = `lock:${lockKey}`; // generate a lock key for the resource and date
    const script = ` // delete the lock for the resource and date by the holder
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end
        return 0
      `;
    await redis.eval(script, { // evaluate the script to delete the lock for the resource and date by the holder
      keys: [key],
      arguments: [holder]
    }); // evaluate the script to delete the lock for the resource and date by the holder
  };