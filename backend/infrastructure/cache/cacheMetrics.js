const counters = {
  cache_hit_total: 0,
  cache_miss_total: 0,
  cache_set_total: 0,
  cache_delete_total: 0,
  cache_error_total: 0,
  cache_lock_acquired_total: 0,
  cache_lock_timeout_total: 0,
  mongodb_fallback_count: 0,
};

const latencies = {
  redis_latency_ms: [],
};

const MAX_LATENCY_SAMPLES = 500;

const increment = (name, amount = 1) => {
  counters[name] = (counters[name] || 0) + amount;
};

const observeRedisLatency = (ms) => {
  if (!Number.isFinite(ms)) return;
  latencies.redis_latency_ms.push(ms);
  if (latencies.redis_latency_ms.length > MAX_LATENCY_SAMPLES) {
    latencies.redis_latency_ms.splice(0, latencies.redis_latency_ms.length - MAX_LATENCY_SAMPLES);
  }
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[idx] * 100) / 100;
};

const snapshot = () => {
  const hits = counters.cache_hit_total || 0;
  const misses = counters.cache_miss_total || 0;
  const totalReads = hits + misses;
  return {
    ...counters,
    cache_hit_ratio: totalReads ? Math.round((hits / totalReads) * 10000) / 100 : 0,
    redis_latency: {
      p50: percentile(latencies.redis_latency_ms, 50),
      p95: percentile(latencies.redis_latency_ms, 95),
      p99: percentile(latencies.redis_latency_ms, 99),
      samples: latencies.redis_latency_ms.length,
    },
  };
};

module.exports = {
  increment,
  observeRedisLatency,
  snapshot,
};
