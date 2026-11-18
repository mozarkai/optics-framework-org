-- One row per report an agent sends through the Optics MCP server's send_feedback tool.
CREATE TABLE feedback (
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  impact TEXT NOT NULL,
  task TEXT NOT NULL,
  description TEXT NOT NULL,
  tool TEXT,
  error TEXT,
  suggestion TEXT,
  version TEXT,
  client TEXT,
  transport TEXT,
  platform TEXT,
  country TEXT
);

-- The daily cap and the digest read one day at a time.
CREATE INDEX feedback_day ON feedback (day);
