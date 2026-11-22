# nullcord

a self-hosted discord server reimplementation built with typescript and node.js, designed for protocol compatibility with official discord clients.

## implemented

- **rest api (`/api/v9`, `/api/v10`):** fastify-based endpoints with discord-compatible json responses, snowflake ids, and field error formatting.
- **websocket gateway:** stateful gateway supporting `hello`, `heartbeat`, `identify`, `resume`, `dispatch`, and `zlib-stream` compression for official clients.
- **auth & users:** registration, login (`scrypt` + hmac tokens), username availability & suggestions, profile fetching and updates (`USER_UPDATE`).
- **friends & relationships:** friend requests by username, accept, block, remove, and real-time `RELATIONSHIP_ADD` / `RELATIONSHIP_REMOVE` events.
- **direct messages:** dm channels, message history, sending, editing, deleting, typing indicators (`TYPING_START`), and real-time `MESSAGE_CREATE` / `MESSAGE_UPDATE` / `MESSAGE_DELETE` events.
- **storage:** built-in `node:sqlite` (`wal` mode).

## stack

- node.js (v24+)
- typescript (`strict: true`)
- fastify + `@fastify/cors` + `@fastify/static`
- `ws`

## setup

```bash
npm install
npm run build
npm start
```

dev mode:

```bash
npm run dev
```

default address: `http://127.0.0.1:3000`
