-- Contact submissions for the Dual Orbit portfolio contact form.
-- One row per accepted enquiry. `created_at` is written by the Pages Function
-- with the server clock; the client's `startedAt` and honeypot are never stored.
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);