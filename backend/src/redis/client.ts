import { createClient, type RedisClientType } from 'redis';

function getRedisUrl(): string {
  const base = process.env.REDIS_URL || 'redis://localhost:6379';
  const password = process.env.REDIS_PASSWORD;
  if (password && !base.includes('@')) {
    return base.replace('redis://', `redis://:${encodeURIComponent(password)}@`);
  }
  return base;
}

const client: RedisClientType = createClient({ url: getRedisUrl() });

client.on('error', (error) => {
  console.error('Redis client error:', error);
});

let connectingPromise: Promise<void> | null = null;

export const getRedis = async () => {
  if (client.isOpen) {
    return client;
  }
  if (!connectingPromise) {
    connectingPromise = client.connect() as unknown as Promise<void>;
  }

  await connectingPromise;
  return client;
};

export const closeRedis = async () => {
  if (client.isOpen) {
    await client.quit();
  }
};
