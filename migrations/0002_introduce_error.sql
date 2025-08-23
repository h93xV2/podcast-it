PRAGMA foreign_keys=OFF;

-- Create new table with the updated CHECK constraint
CREATE TABLE Episodes_new (
    Id INTEGER PRIMARY KEY,
    Slug TEXT UNIQUE,
    AudioFile TEXT,
    "Status" TEXT CHECK("Status" IN ('pending','complete','error')) NOT NULL DEFAULT 'pending',
    Transcript TEXT
);

-- Copy data from old table
INSERT INTO Episodes_new (Id, Slug, AudioFile, "Status", Transcript)
SELECT Id, Slug, AudioFile, "Status", Transcript
FROM Episodes;

-- Replace old table with new one
DROP TABLE Episodes;
ALTER TABLE Episodes_new RENAME TO Episodes;

PRAGMA foreign_keys=ON;