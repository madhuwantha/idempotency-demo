import { getRedis } from '../redis/client';
import crypto from 'crypto';


export type IdempotencyConfig = {
  key: string;
  expiresAt: Date;
};

export type IdempotencyClaim =
  | { cached: true; statusCode: number; data: unknown }
  | { cached: false; owned: boolean };


/**
 * Builds idempotency config.
 * If idempotencyKey is provided, uses it.
 * Otherwise, generates a key from the payload.
 */
export const buildIdempotencyConfig = (
  payload: { userId: string; resourceId: string; date: string },
  idempotencyKey?: string
): IdempotencyConfig => {
  if (idempotencyKey) { // if the idempotency key is provided, use it
    return { // return the idempotency config
      key: idempotencyKey,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  const fingerprint = `${payload.userId}|${payload.resourceId}|${payload.date}`; // generate a fingerprint from the payload
  const autoKey = `auto_${crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')}`;

  return {
    key: autoKey,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000)
  };
};

/**
 * Claims idempotency in Redis.
 * Returns cached response if available, otherwise returns ownership status.
 */
export const claimIdempotency = async (idempotency: IdempotencyConfig): Promise<IdempotencyClaim> => {
  const redis = await getRedis();
  const key = `idem:${idempotency.key}`;
  const ttlMs = Math.max(idempotency.expiresAt.getTime() - Date.now(), 1000);

  const existing = await redis.get(key); // check if the key is already in progress or completed
  if (existing) {
    const parsed = JSON.parse(existing) as {
      state: 'in_progress' | 'completed';
      statusCode?: number;
      response?: unknown;
    };
    if (parsed.state === 'completed') {
      return { // if the key is completed, return true and the response
        cached: true,
        statusCode: parsed.statusCode ?? 200,
        data: parsed.response
      };
    }
    return { cached: false, owned: false }; // if the key is not in progress or completed, return false and not owned by this request
  }

  const claimed = await redis.set( // set the key to in_progress
    key,
    JSON.stringify({ state: 'in_progress' }),
    { NX: true, PX: ttlMs } // set the key to in_progress with a TTL
  );

  if (claimed) { // if the key is already in progress, return false and owned by this request
    return { cached: false, owned: true };
  }

  const retry = await redis.get(key); // check if the key is already in progress or completed
  if (retry) {
    const parsed = JSON.parse(retry) as {
      state: 'in_progress' | 'completed';
      statusCode?: number;
      response?: unknown;
    };
    if (parsed.state === 'completed') {
      return { // if the key is completed, return true and the response
        cached: true,
        statusCode: parsed.statusCode ?? 200,
        data: parsed.response
      };
    }
  }

  return { cached: false, owned: false }; // if the key is not in progress or completed, return false and not owned by this request
}

/**
 * Completes idempotency in Redis.
 * Stores the response and status code.
 */
export const completeIdempotency = async (
  idempotency: IdempotencyConfig,
  response: unknown,
  statusCode: number
): Promise<void> => {
  const redis = await getRedis(); // get the redis client
  const key = `idem:${idempotency.key}`; // generate a key for the idempotency
  const ttlMs = Math.max(idempotency.expiresAt.getTime() - Date.now(), 1000); // set the TTL to the expiry time minus the current time

  await redis.set( // set the key to completed with the response and status code
    key,
    JSON.stringify({
      state: 'completed',
      statusCode,
      response
    }),
    { PX: ttlMs } // set the TTL
  );
};