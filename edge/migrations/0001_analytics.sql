-- One row per page, Markdown, installer or error request the worker answers.
CREATE TABLE hits (
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  method TEXT NOT NULL,
  served TEXT,
  client TEXT NOT NULL,
  agent TEXT,
  referrer TEXT,
  campaign TEXT,
  country TEXT
);

-- One row per interaction site/track.js reports.
CREATE TABLE events (
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  visit TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  target TEXT,
  value REAL,
  client TEXT NOT NULL,
  country TEXT,
  device TEXT
);

-- Reports read a date range, so they scan days rather than the whole history.
CREATE INDEX hits_day ON hits (day);
CREATE INDEX events_day ON events (day);

-- PyPI downloads of optics-framework, refreshed daily from the public ClickHouse dataset.
CREATE TABLE pypi (
  day TEXT NOT NULL,
  version TEXT NOT NULL,
  installer TEXT NOT NULL,
  type TEXT NOT NULL,
  country TEXT NOT NULL,
  downloads INTEGER NOT NULL,
  PRIMARY KEY (day, version, installer, type, country)
);

-- GitHub repository counters and traffic, one value per day, metric and dimension.
CREATE TABLE github (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  dim TEXT NOT NULL DEFAULT '',
  value REAL NOT NULL,
  PRIMARY KEY (day, metric, dim)
);
