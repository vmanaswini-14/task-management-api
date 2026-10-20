const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const db = new DatabaseSync(path.join(__dirname, "tasks.db"));

app.use(express.json({ limit: "100kb" }));

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function asTask(row) {
  if (!row) return null;
  return { ...row, completed: Boolean(row.completed) };
}

function validateTaskInput(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  if (!partial || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return "title must be a non-empty string.";
    }
    if (body.title.trim().length > 200) {
      return "title must be 200 characters or fewer.";
    }
  }

  if (Object.hasOwn(body, "description") &&
      (typeof body.description !== "string" || body.description.length > 2000)) {
    return "description must be a string of at most 2000 characters.";
  }

  if (Object.hasOwn(body, "completed") && typeof body.completed !== "boolean") {
    return "completed must be a boolean.";
  }

  const allowed = new Set(["title", "description", "completed"]);
  const unexpected = Object.keys(body).find((key) => !allowed.has(key));
  if (unexpected) return `Unexpected field: ${unexpected}.`;

  return null;
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

app.get("/", (_req, res) => {
  res.json({
    name: "Task Management API",
    endpoints: [
      "GET /tasks",
      "GET /tasks/:id",
      "POST /tasks",
      "PUT /tasks/:id",
      "DELETE /tasks/:id"
    ]
  });
});

// GET /tasks — retrieve all tasks
app.get("/tasks", (_req, res) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id").all();
  res.status(200).json(rows.map(asTask));
});

// GET /tasks/:id — retrieve one task
app.get("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid task ID." });

  const task = asTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
  if (!task) return res.status(404).json({ error: "Task not found." });
  return res.status(200).json(task);
});

// POST /tasks — create a task
app.post("/tasks", (req, res) => {
  const validationError = validateTaskInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const title = req.body.title.trim();
  const description = req.body.description ?? "";
  const completed = req.body.completed === true ? 1 : 0;

  const result = db.prepare(
    "INSERT INTO tasks (title, description, completed) VALUES (?, ?, ?)"
  ).run(title, description, completed);

  const task = asTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(result.lastInsertRowid)));
  return res.status(201).json(task);
});

// PUT /tasks/:id — update a task
app.put("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid task ID." });

  const validationError = validateTaskInput(req.body, true);
  if (validationError) return res.status(400).json({ error: validationError });

  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Task not found." });

  const title = Object.hasOwn(req.body, "title") ? req.body.title.trim() : existing.title;
  const description = Object.hasOwn(req.body, "description") ? req.body.description : existing.description;
  const completed = Object.hasOwn(req.body, "completed") ? Number(req.body.completed) : existing.completed;

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, completed, id);

  const task = asTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
  return res.status(200).json(task);
});

// DELETE /tasks/:id — delete a task
app.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid task ID." });

  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found." });
  return res.status(204).send();
});

// Return a JSON error for malformed JSON bodies.
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON body." });
  }
  return next(err);
});

const server = app.listen(PORT, () => {
  console.log(`Task Management API running at http://localhost:${PORT}`);
  console.log("SQLite database:", path.join(__dirname, "tasks.db"));
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
