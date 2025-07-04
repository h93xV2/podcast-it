DROP TABLE IF EXISTS Episodes;
CREATE TABLE IF NOT EXISTS Episodes (
    Id INTEGER PRIMARY KEY,
    Slug TEXT UNIQUE,
    AudioFile TEXT,
    "Status" TEXT CHECK(
        "Status" IN (
            'pending',
            'complete'
        )
    ) NOT NULL DEFAULT 'pending',
    Title TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    Transcript TEXT
);