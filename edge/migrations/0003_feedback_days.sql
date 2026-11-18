-- One counter row per day, so the daily cap costs one row read and one row write per report.
CREATE TABLE feedback_days (
  day TEXT PRIMARY KEY,
  n INTEGER NOT NULL
);
