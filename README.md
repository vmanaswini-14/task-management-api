# Task Management API

A small REST API built with Node.js, Express, and SQLite. It supports CRUD operations, request validation, meaningful HTTP status codes, and persistent storage.

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)
- npm

## Run locally

```bash
npm install
npm start
```

The API runs at `http://localhost:3001`. SQLite data is stored in `tasks.db` and persists between restarts.

## Endpoints

| Method | Endpoint | Success status | Purpose |
|---|---|---:|---|
| GET | `/tasks` | 200 | List all tasks |
| GET | `/tasks/:id` | 200 | Get a task by ID |
| POST | `/tasks` | 201 | Create a task |
| PUT | `/tasks/:id` | 200 | Update a task |
| DELETE | `/tasks/:id` | 204 | Delete a task |

Invalid request payloads and invalid IDs return `400`. Requests for a task that does not exist return `404`.

## Quick tests (PowerShell)

Create a task:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/tasks -ContentType "application/json" -Body '{"title":"Build REST API","description":"CRUD and validation"}'
```

List tasks:

```powershell
Invoke-RestMethod http://localhost:3001/tasks
```

Get task 1:

```powershell
Invoke-RestMethod http://localhost:3001/tasks/1
```

Update task 1:

```powershell
Invoke-RestMethod -Method Put -Uri http://localhost:3001/tasks/1 -ContentType "application/json" -Body '{"title":"Build REST API v2","completed":true}'
```

Delete task 1 (204 No Content):

```powershell
Invoke-WebRequest -Method Delete -Uri http://localhost:3001/tasks/1
```

Invalid title test (should return HTTP 400):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/tasks -ContentType "application/json" -Body '{"title":"   "}'
```

## Implementation evidence

- Routes are defined in `server.js`.
- Payload validation is handled by `validateTaskInput`.
- SQL schema and prepared statements provide SQLite persistence.
- HTTP statuses are explicitly set in each route.
- No secrets are required by this project.
