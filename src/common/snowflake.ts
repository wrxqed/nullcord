const DISCORD_EPOCH = 1420070400000n;
const WORKER_ID_BITS = 5n;
const PROCESS_ID_BITS = 5n;
const SEQUENCE_BITS = 12n;

const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const PROCESS_SHIFT = SEQUENCE_BITS;
const WORKER_SHIFT = SEQUENCE_BITS + PROCESS_ID_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + PROCESS_ID_BITS + WORKER_ID_BITS;

let lastTimestamp = -1n;
let sequence = 0n;

function waitNextMillisecond(previousTimestamp: bigint): bigint {
  let current = BigInt(Date.now());
  while (current <= previousTimestamp) {
    current = BigInt(Date.now());
  }
  return current;
}

export function generateSnowflake(workerId = 0n, processId = 0n): string {
  let timestamp = BigInt(Date.now());

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & MAX_SEQUENCE;
    if (sequence === 0n) {
      timestamp = waitNextMillisecond(lastTimestamp);
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  const snowflake =
    ((timestamp - DISCORD_EPOCH) << TIMESTAMP_SHIFT) |
    ((workerId & 31n) << WORKER_SHIFT) |
    ((processId & 31n) << PROCESS_SHIFT) |
    sequence;

  return snowflake.toString();
}
