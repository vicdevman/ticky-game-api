import { redis } from "../db/cache.js";

// Save JSON state
export async function setState(key, data, ttl = null) {
  const value = JSON.stringify(data);

  if (ttl) {
    await redis.set(key, value, { EX: ttl });
  } else {
    await redis.set(key, value);
  }
}

// Get JSON state
export async function getState(key) {
  const state = await redis.get(key);
  return state ? JSON.parse(state) : null;
}

// Delete state
export async function clearState(key) {
  await redis.del(key);
}