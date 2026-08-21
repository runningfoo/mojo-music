-- MOJO content management schema

CREATE TABLE shows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'FL',
    time TEXT NOT NULL,
    event_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'public'
        CHECK (type IN ('public', 'private')),
    details_url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shows_date ON shows(date);


CREATE TABLE gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Existing site images can continue using these paths.
    src TEXT,
    avif TEXT,

    -- New admin uploads will eventually use an R2 object key.
    object_key TEXT,

    alt TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'live',
    size TEXT NOT NULL DEFAULT 'square'
        CHECK (size IN ('square', 'wide', 'tall')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gallery_sort_order ON gallery(sort_order);


CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    youtube_id TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    thumbnail TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0
        CHECK (featured IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_videos_sort_order ON videos(sort_order);


CREATE TABLE music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    credit TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',

    -- Existing/static URL if applicable.
    audio_url TEXT NOT NULL DEFAULT '',

    -- New uploaded audio can eventually point to R2.
    audio_key TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_music_sort_order ON music(sort_order);