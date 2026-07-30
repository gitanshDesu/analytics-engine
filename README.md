# Analytics Engine

A self-hosted analytics platform: a Spring Boot backend (`analytics-backend`) ingesting events via Kafka into a MongoDB replica set, and a Next.js dashboard (`frontend`).

## Project structure

```
analytics-engine/
├── analytics-backend/   # Spring Boot API (Gradle)
├── frontend/             # Next.js dashboard
└── sdk/                  # JS tracking SDK
```

## Prerequisites

- Java 17+ and the Gradle wrapper (bundled)
- Node.js 18+ and npm
- MongoDB (`mongod`, `mongosh`) installed locally
- Docker

## 1. Backend setup (`analytics-backend`)

Config lives in `analytics-backend/src/main/resources/application.properties`:

- Mongo: `mongodb://127.0.0.1:27020,127.0.0.1:27021/analytics?replicaSet=rs_analytics`
- Kafka: `localhost:9092`
- App port: `8085` (context path `/analytics-backend`)

### 1.1 Start Kafka

The backend expects a broker at `localhost:9092`. Start one with Docker (single-node, KRaft mode — no Zookeeper needed):

```bash
docker run -d --name analytics-kafka -p 9092:9092 apache/kafka:latest
```

### 1.2 Set up the MongoDB replica set

The app connects to a two-node replica set (`rs_analytics`) on ports `27020` (primary) and `27021` (secondary). These are plain local `mongod` processes, not Docker containers — a replica set config applies to the whole `mongod` server, not just one database, so if you already run Mongo for other projects, check before starting new instances.

**Check whether the servers are already running:**

```bash
lsof -i :27020   # primary
lsof -i :27021   # secondary
```

If both return a `mongod` process, skip straight to connecting — the replica set is already up.

**If nothing is listening, start both members:**

```bash
mkdir -p ~/mongo-data/rs-primary ~/mongo-data/rs-secondary

mongod --replSet rs_analytics --port 27020 --dbpath ~/mongo-data/rs-primary \
  --bind_ip localhost --fork --logpath ~/mongo-data/rs-primary/mongod.log

mongod --replSet rs_analytics --port 27021 --dbpath ~/mongo-data/rs-secondary \
  --bind_ip localhost --fork --logpath ~/mongo-data/rs-secondary/mongod.log
```

**If nothing is listening but `~/mongo-data/rs-primary` and `~/mongo-data/rs-secondary` already have data in them** (e.g. the replica set was previously initiated but the `mongod` processes got killed or the machine restarted), just start both members with the command above, then confirm they rejoined the replica set — no need to run `rs.initiate` again:

```bash
mongosh --port 27020 --quiet --eval 'rs.status().members.map(m => ({name: m.name, stateStr: m.stateStr}))'
```

You should see one `PRIMARY` and one `SECONDARY`.

**Initialize the replica set (first time only):**

```bash
mongosh --port 27020
```

```javascript
rs.initiate({
  _id: "rs_analytics",
  members: [
    { _id: 0, host: "127.0.0.1:27020" },
    { _id: 1, host: "127.0.0.1:27021" }
  ]
})
```

Check status any time with `rs.status()`.

### 1.3 Configure secrets

The app requires a JWT secret at startup. Create a `.env` file in `analytics-backend/`:

```
JWT_SECRET=your-local-dev-secret
```

### 1.4 Run the backend

```bash
cd analytics-backend
./gradlew bootRun
```

The API is served at `http://localhost:8085/analytics-backend`.

### 1.5 After your session ends

Since the two `mongod` instances back a shared replica set (other local apps/dbs may depend on it staying healthy), restart both members cleanly before you finish, rather than leaving them killed or in a stale state:

```bash
mongod --shutdown --dbpath ~/mongo-data/rs-primary
mongod --shutdown --dbpath ~/mongo-data/rs-secondary

mongod --replSet rs_analytics --port 27020 --dbpath ~/mongo-data/rs-primary \
  --bind_ip localhost --fork --logpath ~/mongo-data/rs-primary/mongod.log

mongod --replSet rs_analytics --port 27021 --dbpath ~/mongo-data/rs-secondary \
  --bind_ip localhost --fork --logpath ~/mongo-data/rs-secondary/mongod.log
```

## 2. Frontend setup (`frontend`)

```bash
cd analytics-engine/frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.
