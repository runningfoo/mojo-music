interface BookingEmailBinding {
  send(message: {
    to: string | string[];
    from: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

interface Env {
  ASSETS: Fetcher;
  EMAIL?: BookingEmailBinding;
  DB: D1Database;
  MEDIA: R2Bucket;
}

type Booking = Record<string, string>;

type ShowRow = {
  id: number;
  date: string;
  venue: string;
  city: string;
  state: string;
  time: string;
  event_name: string;
  type: string;
  details_url: string;
  sort_order: number;
};

type GalleryRow = {
  id: number;
  src: string | null;
  avif: string | null;
  object_key: string | null;
  alt: string;
  category: string;
  size: string;
  sort_order: number;
};

type VideoRow = {
  id: number;
  title: string;
  youtube_id: string;
  category: string;
  thumbnail: string;
  featured: number;
  sort_order: number;
};

type MusicRow = {
  id: number;
  title: string;
  credit: string;
  duration: string;
  audio_url: string;
  audio_key: string | null;
  sort_order: number;
};


/* -------------------------------------------------------
   SECURITY / RESPONSE HELPERS
------------------------------------------------------- */

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=()",
};

const json = (
  data: unknown,
  status = 200
) => {
  const headers = new Headers({
    "Content-Type":
      "application/json; charset=utf-8",

    // Always return current API state.
    "Cache-Control": "no-store",
  });

  Object.entries(
    securityHeaders
  ).forEach(([name, value]) => {
    headers.set(name, value);
  });

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers,
    }
  );
};


/* -------------------------------------------------------
   ROW MAPPERS
------------------------------------------------------- */

const mapShowRow = (
  show: ShowRow
) => ({
  id: show.id,
  date: show.date,
  venue: show.venue,
  city: show.city,
  state: show.state,
  time: show.time,
  eventName: show.event_name,
  type: show.type,
  detailsUrl: show.details_url,
});

const mapGalleryRow = (
  image: GalleryRow
) => ({
  id: image.id,
  src: image.src,
  avif: image.avif,
  alt: image.alt,
  category: image.category,
  size: image.size,
});

const mapVideoRow = (
  video: VideoRow
) => ({
  id: video.id,
  title: video.title,
  youtubeId: video.youtube_id,
  category: video.category,
  thumbnail: video.thumbnail,
  featured: Boolean(
    video.featured
  ),
});

const mapMusicRow = (
  track: MusicRow
) => ({
  id: track.id,
  title: track.title,
  credit: track.credit,
  duration: track.duration,
  audioUrl: track.audio_url,
});


/* -------------------------------------------------------
   SHOWS - PUBLIC READ
------------------------------------------------------- */

const showsHandler = async (
  request: Request,
  env: Env
) => {
  if (request.method !== "GET") {
    return json(
      { error: "Method not allowed." },
      405
    );
  }

  try {
    const { results } =
      await env.DB.prepare(`
        SELECT
          id,
          date,
          venue,
          city,
          state,
          time,
          event_name,
          type,
          details_url,
          sort_order
        FROM shows
        ORDER BY
          date ASC,
          sort_order ASC,
          id ASC
      `).all<ShowRow>();

    return json(
      results.map(mapShowRow)
    );
  } catch (error) {
    console.error(
      "Could not load shows",
      error
    );

    return json(
      {
        error:
          "Could not load shows.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   SHOWS - ADMIN CREATE
------------------------------------------------------- */

const adminShowsHandler = async (
  request: Request,
  env: Env
) => {
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.includes(
        "application/json"
      )
  ) {
    return json(
      {
        error:
          "Content-Type must be application/json.",
      },
      415
    );
  }

  try {
    const body =
      (await request.json()) as {
        date?: string;
        venue?: string;
        city?: string;
        state?: string;
        time?: string;
        eventName?: string;
        type?: string;
        detailsUrl?: string;
      };

    const date =
      body.date?.trim();

    const venue =
      body.venue?.trim();

    const city =
      body.city?.trim();

    const state =
      body.state
        ?.trim()
        .toUpperCase() ||
      "FL";

    const time =
      body.time?.trim();

    const eventName =
      body.eventName?.trim();

    const type =
      body.type === "private"
        ? "private"
        : "public";

    const detailsUrl =
      body.detailsUrl?.trim() ||
      "";

    if (
      !date ||
      !venue ||
      !city ||
      !time ||
      !eventName
    ) {
      return json(
        {
          error:
            "Date, event name, venue, city, and time are required.",
        },
        400
      );
    }

    const nextOrder =
      await env.DB.prepare(`
        SELECT
          COALESCE(
            MAX(sort_order),
            -1
          ) + 1
          AS next_sort_order
        FROM shows
      `).first<{
        next_sort_order: number;
      }>();

    const result =
      await env.DB.prepare(`
        INSERT INTO shows (
          date,
          venue,
          city,
          state,
          time,
          event_name,
          type,
          details_url,
          sort_order
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
        .bind(
          date,
          venue,
          city,
          state,
          time,
          eventName,
          type,
          detailsUrl,
          nextOrder
            ?.next_sort_order ??
            0
        )
        .run();

    const id =
      Number(
        result.meta.last_row_id
      );

    const createdShow =
      await env.DB.prepare(`
        SELECT
          id,
          date,
          venue,
          city,
          state,
          time,
          event_name,
          type,
          details_url,
          sort_order
        FROM shows
        WHERE id = ?
      `)
        .bind(id)
        .first<ShowRow>();

    if (!createdShow) {
      return json(
        {
          error:
            "Show was created but could not be loaded.",
        },
        500
      );
    }

    return json(
      mapShowRow(createdShow),
      201
    );
  } catch (error) {
    console.error(
      "Could not create show",
      error
    );

    return json(
      {
        error:
          "Could not create show.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   SHOWS - ADMIN ITEM
------------------------------------------------------- */

const adminShowItemHandler = async (
  request: Request,
  env: Env,
  id: number
) => {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return json(
      { error: "Invalid show ID." },
      400
    );
  }

  /* -------------------------
     DELETE
  ------------------------- */

  if (
    request.method === "DELETE"
  ) {
    try {
      const result =
        await env.DB.prepare(`
          DELETE FROM shows
          WHERE id = ?
        `)
          .bind(id)
          .run();

      if (
        !result.meta.changes
      ) {
        return json(
          {
            error:
              "Show not found.",
          },
          404
        );
      }

      return json({
        ok: true,
      });
    } catch (error) {
      console.error(
        "Could not delete show",
        error
      );

      return json(
        {
          error:
            "Could not delete show.",
        },
        500
      );
    }
  }


  /* -------------------------
     UPDATE
  ------------------------- */

  if (request.method === "PUT") {
    if (
      !request.headers
        .get("content-type")
        ?.includes(
          "application/json"
        )
    ) {
      return json(
        {
          error:
            "Content-Type must be application/json.",
        },
        415
      );
    }

    try {
      const body =
        (await request.json()) as {
          date?: string;
          venue?: string;
          city?: string;
          state?: string;
          time?: string;
          eventName?: string;
          type?: string;
          detailsUrl?: string;
        };

      const date =
        body.date?.trim();

      const venue =
        body.venue?.trim();

      const city =
        body.city?.trim();

      const state =
        body.state
          ?.trim()
          .toUpperCase() ||
        "FL";

      const time =
        body.time?.trim();

      const eventName =
        body.eventName?.trim();

      const type =
        body.type === "private"
          ? "private"
          : "public";

      const detailsUrl =
        body.detailsUrl
          ?.trim() ||
        "";

      if (
        !date ||
        !venue ||
        !city ||
        !time ||
        !eventName
      ) {
        return json(
          {
            error:
              "Date, event name, venue, city, and time are required.",
          },
          400
        );
      }

      const result =
        await env.DB.prepare(`
          UPDATE shows
          SET
            date = ?,
            venue = ?,
            city = ?,
            state = ?,
            time = ?,
            event_name = ?,
            type = ?,
            details_url = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `)
          .bind(
            date,
            venue,
            city,
            state,
            time,
            eventName,
            type,
            detailsUrl,
            id
          )
          .run();

      if (
        !result.meta.changes
      ) {
        return json(
          {
            error:
              "Show not found.",
          },
          404
        );
      }

      const updatedShow =
        await env.DB.prepare(`
          SELECT
            id,
            date,
            venue,
            city,
            state,
            time,
            event_name,
            type,
            details_url,
            sort_order
          FROM shows
          WHERE id = ?
        `)
          .bind(id)
          .first<ShowRow>();

      if (!updatedShow) {
        return json(
          {
            error:
              "Show not found.",
          },
          404
        );
      }

      return json(
        mapShowRow(updatedShow)
      );
    } catch (error) {
      console.error(
        "Could not update show",
        error
      );

      return json(
        {
          error:
            "Could not update show.",
        },
        500
      );
    }
  }

  return json(
    {
      error:
        "Method not allowed.",
    },
    405
  );
};


/* -------------------------------------------------------
   GALLERY - PUBLIC READ
------------------------------------------------------- */

const galleryHandler = async (
  request: Request,
  env: Env
) => {
  if (request.method !== "GET") {
    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  try {
    const { results } =
      await env.DB.prepare(`
        SELECT
          id,
          src,
          avif,
          object_key,
          alt,
          category,
          size,
          sort_order
        FROM gallery
        ORDER BY
          sort_order ASC,
          id ASC
      `).all<GalleryRow>();

    return json(
      results.map(mapGalleryRow)
    );
  } catch (error) {
    console.error(
      "Could not load gallery",
      error
    );

    return json(
      {
        error:
          "Could not load gallery.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   VIDEOS - PUBLIC READ
------------------------------------------------------- */

const videosHandler = async (
  request: Request,
  env: Env
) => {
  if (request.method !== "GET") {
    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  try {
    const { results } =
      await env.DB.prepare(`
        SELECT
          id,
          title,
          youtube_id,
          category,
          thumbnail,
          featured,
          sort_order
        FROM videos
        ORDER BY
          featured DESC,
          sort_order ASC,
          id ASC
      `).all<VideoRow>();

    return json(
      results.map(mapVideoRow)
    );
  } catch (error) {
    console.error(
      "Could not load videos",
      error
    );

    return json(
      {
        error:
          "Could not load videos.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   VIDEOS - YOUTUBE HELPERS
------------------------------------------------------- */

const normalizeYouTubeId = (
  value: string
) => {
  let input =
    value.trim();

  if (!input) {
    return "";
  }

  // Already an 11-character YouTube ID.
  if (
    /^[A-Za-z0-9_-]{11}$/.test(
      input
    )
  ) {
    return input;
  }

  // Allow URLs without https://
  if (
    /^(?:www\.|m\.)?youtube\.com\//i.test(
      input
    ) ||
    /^youtu\.be\//i.test(
      input
    )
  ) {
    input =
      `https://${input}`;
  }

  try {
    const url =
      new URL(input);

    const hostname =
      url.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    /*
     * youtu.be/VIDEO_ID
     */
    if (
      hostname ===
      "youtu.be"
    ) {
      const id =
        url.pathname
          .split("/")
          .filter(Boolean)[0];

      return /^[A-Za-z0-9_-]{11}$/.test(
        id || ""
      )
        ? id
        : "";
    }

    if (
      hostname ===
        "youtube.com" ||
      hostname ===
        "m.youtube.com"
    ) {
      /*
       * youtube.com/watch?v=VIDEO_ID
       */
      const watchId =
        url.searchParams.get(
          "v"
        );

      if (
        watchId &&
        /^[A-Za-z0-9_-]{11}$/.test(
          watchId
        )
      ) {
        return watchId;
      }

      const parts =
        url.pathname
          .split("/")
          .filter(Boolean);

      /*
       * youtube.com/shorts/VIDEO_ID
       * youtube.com/embed/VIDEO_ID
       * youtube.com/live/VIDEO_ID
       */
      if (
        [
          "shorts",
          "embed",
          "live",
        ].includes(
          parts[0]
        ) &&
        /^[A-Za-z0-9_-]{11}$/.test(
          parts[1] || ""
        )
      ) {
        return parts[1];
      }
    }
  } catch {
    return "";
  }

  return "";
};


/* -------------------------------------------------------
   VIDEOS - ADMIN CREATE
------------------------------------------------------- */

const adminVideosHandler = async (
  request: Request,
  env: Env
) => {
  if (
    request.method !== "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.includes(
        "application/json"
      )
  ) {
    return json(
      {
        error:
          "Content-Type must be application/json.",
      },
      415
    );
  }

  try {
    const body =
      (await request.json()) as {
        title?: string;
        youtube?: string;
        category?: string;
        thumbnail?: string;
        featured?: boolean;
      };

    const title =
      body.title?.trim();

    const youtubeInput =
      body.youtube?.trim() ||
      "";

    const category =
      body.category?.trim() ||
      "live";

    if (!title) {
      return json(
        {
          error:
            "Video title is required.",
        },
        400
      );
    }

    const youtubeId =
      normalizeYouTubeId(
        youtubeInput
      );

    if (
      youtubeInput &&
      !youtubeId
    ) {
      return json(
        {
          error:
            "Please enter a valid YouTube URL or video ID.",
        },
        400
      );
    }

    const thumbnail =
      body.thumbnail?.trim() ||
      (
        youtubeId
          ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
          : ""
      );

    const featured =
      body.featured ? 1 : 0;

    const nextOrder =
      await env.DB.prepare(`
        SELECT
          COALESCE(
            MAX(sort_order),
            -1
          ) + 1
          AS next_sort_order
        FROM videos
      `).first<{
        next_sort_order: number;
      }>();

    const result =
      await env.DB.prepare(`
        INSERT INTO videos (
          title,
          youtube_id,
          category,
          thumbnail,
          featured,
          sort_order
        )
        VALUES (
          ?, ?, ?, ?, ?, ?
        )
      `)
        .bind(
          title,
          youtubeId,
          category,
          thumbnail,
          featured,
          nextOrder
            ?.next_sort_order ??
            0
        )
        .run();

    const id =
      Number(
        result.meta.last_row_id
      );

    const createdVideo =
      await env.DB.prepare(`
        SELECT
          id,
          title,
          youtube_id,
          category,
          thumbnail,
          featured,
          sort_order
        FROM videos
        WHERE id = ?
      `)
        .bind(id)
        .first<VideoRow>();

    if (!createdVideo) {
      return json(
        {
          error:
            "Video was created but could not be loaded.",
        },
        500
      );
    }

    return json(
      mapVideoRow(
        createdVideo
      ),
      201
    );
  } catch (error) {
    console.error(
      "Could not create video",
      error
    );

    return json(
      {
        error:
          "Could not create video.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   VIDEOS - ADMIN ITEM
------------------------------------------------------- */

const adminVideoItemHandler =
  async (
    request: Request,
    env: Env,
    id: number
  ) => {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return json(
        {
          error:
            "Invalid video ID.",
        },
        400
      );
    }


    /* -------------------------
       UPDATE
    ------------------------- */

    if (
      request.method === "PUT"
    ) {
      if (
        !request.headers
          .get("content-type")
          ?.includes(
            "application/json"
          )
      ) {
        return json(
          {
            error:
              "Content-Type must be application/json.",
          },
          415
        );
      }

      try {
        const body =
          (await request.json()) as {
            title?: string;
            youtube?: string;
            category?: string;
            thumbnail?: string;
            featured?: boolean;
          };

        const title =
          body.title?.trim();

        const youtubeInput =
          body.youtube
            ?.trim() ||
          "";

        const category =
          body.category
            ?.trim() ||
          "live";

        if (!title) {
          return json(
            {
              error:
                "Video title is required.",
            },
            400
          );
        }

        const youtubeId =
          normalizeYouTubeId(
            youtubeInput
          );

        if (
          youtubeInput &&
          !youtubeId
        ) {
          return json(
            {
              error:
                "Please enter a valid YouTube URL or video ID.",
            },
            400
          );
        }

        const thumbnail =
          body.thumbnail
            ?.trim() ||
          (
            youtubeId
              ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
              : ""
          );

        const featured =
          body.featured
            ? 1
            : 0;

        const result =
          await env.DB.prepare(`
            UPDATE videos
            SET
              title = ?,
              youtube_id = ?,
              category = ?,
              thumbnail = ?,
              featured = ?,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `)
            .bind(
              title,
              youtubeId,
              category,
              thumbnail,
              featured,
              id
            )
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Video not found.",
            },
            404
          );
        }

        const updatedVideo =
          await env.DB.prepare(`
            SELECT
              id,
              title,
              youtube_id,
              category,
              thumbnail,
              featured,
              sort_order
            FROM videos
            WHERE id = ?
          `)
            .bind(id)
            .first<VideoRow>();

        if (
          !updatedVideo
        ) {
          return json(
            {
              error:
                "Video not found.",
            },
            404
          );
        }

        return json(
          mapVideoRow(
            updatedVideo
          )
        );
      } catch (error) {
        console.error(
          "Could not update video",
          error
        );

        return json(
          {
            error:
              "Could not update video.",
          },
          500
        );
      }
    }


    /* -------------------------
       DELETE
    ------------------------- */

    if (
      request.method ===
      "DELETE"
    ) {
      try {
        const result =
          await env.DB.prepare(`
            DELETE FROM videos
            WHERE id = ?
          `)
            .bind(id)
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Video not found.",
            },
            404
          );
        }

        return json({
          ok: true,
        });
      } catch (error) {
        console.error(
          "Could not delete video",
          error
        );

        return json(
          {
            error:
              "Could not delete video.",
          },
          500
        );
      }
    }

    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  };


/* -------------------------------------------------------
   MUSIC - PUBLIC READ
------------------------------------------------------- */

const musicHandler = async (
  request: Request,
  env: Env
) => {
  if (
    request.method !== "GET"
  ) {
    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  try {
    const { results } =
      await env.DB.prepare(`
        SELECT
          id,
          title,
          credit,
          duration,
          audio_url,
          audio_key,
          sort_order
        FROM music
        ORDER BY
          sort_order ASC,
          id ASC
      `).all<MusicRow>();

    return json(
      results.map(mapMusicRow)
    );
  } catch (error) {
    console.error(
      "Could not load music",
      error
    );

    return json(
      {
        error:
          "Could not load music.",
      },
      500
    );
  }
};


/* -------------------------------------------------------
   BOOKING
------------------------------------------------------- */

const clean = (
  value: unknown,
  max = 300
) =>
  String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      ""
    )
    .trim()
    .slice(0, max);

const validEmail = (
  email: string
) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
    email
  );

const escapeHtml = (
  value: string
) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ||
      character
  );

const readBooking = (
  input: Record<
    string,
    unknown
  >
): Booking => ({
  name: clean(
    input.name,
    100
  ),

  email: clean(
    input.email,
    160
  ).toLowerCase(),

  phone: clean(
    input.phone,
    40
  ),

  eventType: clean(
    input.eventType,
    80
  ),

  eventDate: clean(
    input.eventDate,
    20
  ),

  location: clean(
    input.location,
    180
  ),

  audience: clean(
    input.audience,
    12
  ),

  message: clean(
    input.message,
    3000
  ),

  website: clean(
    input.website,
    200
  ),

  startedAt: clean(
    input.startedAt,
    30
  ),
});

const bookingHandler = async (
  request: Request,
  env: Env
) => {
  if (
    request.method !== "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.includes(
        "application/json"
      )
  ) {
    return json(
      {
        error:
          "Please send a valid form request.",
      },
      415
    );
  }

  const length =
    Number(
      request.headers.get(
        "content-length"
      ) || 0
    );

  if (length > 12_000) {
    return json(
      {
        error:
          "That message is too large.",
      },
      413
    );
  }

  let input:
    Record<string, unknown>;

  try {
    input =
      await request.json();
  } catch {
    return json(
      {
        error:
          "Please send a valid form request.",
      },
      400
    );
  }

  const booking =
    readBooking(input);

  if (booking.website) {
    return json({
      ok: true,
    });
  }

  const startedAt =
    Number(
      booking.startedAt
    );

  if (
    !startedAt ||
    Date.now() -
      startedAt <
      2500
  ) {
    return json(
      {
        error:
          "Please take a moment and try again.",
      },
      429
    );
  }

  if (
    !booking.name ||
    !booking.email ||
    !booking.eventType ||
    !booking.message
  ) {
    return json(
      {
        error:
          "Please complete every required field.",
      },
      400
    );
  }

  if (
    !validEmail(
      booking.email
    )
  ) {
    return json(
      {
        error:
          "Please enter a valid email address.",
      },
      400
    );
  }

  if (
    (
      booking.message.match(
        /https?:\/\//gi
      ) || []
    ).length > 2 ||
    /(casino|crypto|backlink|seo service)/i.test(
      booking.message
    )
  ) {
    return json(
      {
        error:
          "Your message could not be accepted.",
      },
      400
    );
  }

  const url =
    new URL(request.url);

  const isLocal =
    [
      "localhost",
      "127.0.0.1",
      "::1",
    ].includes(
      url.hostname
    );

  if (!env.EMAIL) {
    if (isLocal) {
      return json({
        ok: true,
        delivery: "preview",
      });
    }

    return json(
      {
        error:
          "Online booking is being configured. Please try again soon.",
      },
      503
    );
  }

  const rows = [
    [
      "Name",
      booking.name,
    ],
    [
      "Email",
      booking.email,
    ],
    [
      "Phone",
      booking.phone ||
        "Not provided",
    ],
    [
      "Event type",
      booking.eventType,
    ],
    [
      "Date",
      booking.eventDate ||
        "Not provided",
    ],
    [
      "Location",
      booking.location ||
        "Not provided",
    ],
    [
      "Audience",
      booking.audience ||
        "Not provided",
    ],
    [
      "Message",
      booking.message,
    ],
  ];

  const html =
    `<h1>New MOJO booking inquiry</h1>` +
    rows
      .map(
        ([label, value]) =>
          `<p><strong>${label}:</strong><br>${escapeHtml(
            value
          ).replace(
            /\n/g,
            "<br>"
          )}</p>`
      )
      .join("");

  const text =
    `New MOJO booking inquiry\n\n` +
    rows
      .map(
        ([label, value]) =>
          `${label}: ${value}`
      )
      .join("\n\n");

  try {
    await env.EMAIL.send({
      to:
        "mojoduomusic@gmail.com",

      from:
        "MOJO Website <booking@mojomusic.org>",

      replyTo:
        booking.email,

      subject:
        `MOJO booking inquiry — ${booking.eventType}`,

      html,
      text,
    });
  } catch (error) {
    const failure =
      error as {
        code?: unknown;
        message?: unknown;
      };

    console.error(
      "Booking email delivery failed",
      {
        code:
          String(
            failure.code ??
              "unknown"
          ),

        message:
          String(
            failure.message ??
              "Unknown error"
          ),
      }
    );

    return json(
      {
        error:
          "We couldn't send your inquiry just now. Please try again.",
      },
      502
    );
  }

  return json({
    ok: true,
  });
};


/* -------------------------------------------------------
   MEDIA - GALLERY
------------------------------------------------------- */

const galleryMediaHandler =
  async (
    request: Request,
    env: Env,
    key: string
  ) => {
    if (
      request.method !== "GET"
    ) {
      return json(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    if (
      !key.startsWith(
        "gallery/"
      )
    ) {
      return json(
        {
          error:
            "Invalid media path.",
        },
        400
      );
    }

    try {
      const object =
        await env.MEDIA.get(
          key
        );

      if (!object) {
        return json(
          {
            error:
              "Media not found.",
          },
          404
        );
      }

      const headers =
        new Headers();

      object.writeHttpMetadata(
        headers
      );

      headers.set(
        "ETag",
        object.httpEtag
      );

      Object.entries(
        securityHeaders
      ).forEach(
        ([name, value]) => {
          headers.set(
            name,
            value
          );
        }
      );

      return new Response(
        object.body,
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error(
        "Could not load media",
        error
      );

      return json(
        {
          error:
            "Could not load media.",
        },
        500
      );
    }
  };


/* -------------------------------------------------------
   MEDIA - MUSIC
------------------------------------------------------- */

const musicMediaHandler =
  async (
    request: Request,
    env: Env,
    key: string
  ) => {
    if (
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {
      return json(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    if (
      !key.startsWith(
        "music/"
      )
    ) {
      return json(
        {
          error:
            "Invalid media path.",
        },
        400
      );
    }

    try {
      /*
       * Get authoritative metadata first.
       */
      const metadata =
        await env.MEDIA.head(
          key
        );

      if (!metadata) {
        return json(
          {
            error:
              "Media not found.",
          },
          404
        );
      }

      const createHeaders =
        () => {
          const headers =
            new Headers();

          metadata.writeHttpMetadata(
            headers
          );

          headers.set(
            "ETag",
            metadata.httpEtag
          );

          headers.set(
            "Accept-Ranges",
            "bytes"
          );

          Object.entries(
            securityHeaders
          ).forEach(
            ([name, value]) => {
              headers.set(
                name,
                value
              );
            }
          );

          return headers;
        };


      /* -------------------------
         HEAD
      ------------------------- */

      if (
        request.method ===
        "HEAD"
      ) {
        const headers =
          createHeaders();

        headers.set(
          "Content-Length",
          String(
            metadata.size
          )
        );

        return new Response(
          null,
          {
            status: 200,
            headers,
          }
        );
      }

      const rangeHeader =
        request.headers.get(
          "range"
        );


      /* -------------------------
         FULL GET
      ------------------------- */

      if (!rangeHeader) {
        const object =
          await env.MEDIA.get(
            key
          );

        if (
          !object ||
          !("body" in object)
        ) {
          return json(
            {
              error:
                "Media not found.",
            },
            404
          );
        }

        const headers =
          createHeaders();

        headers.set(
          "Content-Length",
          String(
            metadata.size
          )
        );

        return new Response(
          object.body,
          {
            status: 200,
            headers,
          }
        );
      }


      /* -------------------------
         PARSE SINGLE RANGE
      ------------------------- */

      const rangeMatch =
        rangeHeader
          .trim()
          .match(
            /^bytes=(\d*)-(\d*)$/i
          );

      const rangeError =
        () => {
          const headers =
            createHeaders();

          headers.set(
            "Content-Range",
            `bytes */${metadata.size}`
          );

          return new Response(
            null,
            {
              status: 416,
              headers,
            }
          );
        };

      if (
        !rangeMatch ||
        rangeHeader.includes(
          ","
        ) ||
        metadata.size === 0
      ) {
        return rangeError();
      }

      const startText =
        rangeMatch[1];

      const endText =
        rangeMatch[2];

      if (
        !startText &&
        !endText
      ) {
        return rangeError();
      }

      let start: number;
      let end: number;


      /*
       * Suffix:
       * bytes=-1024
       */

      if (!startText) {
        const suffixLength =
          Number(endText);

        if (
          !Number.isSafeInteger(
            suffixLength
          ) ||
          suffixLength <= 0
        ) {
          return rangeError();
        }

        const length =
          Math.min(
            suffixLength,
            metadata.size
          );

        start =
          metadata.size -
          length;

        end =
          metadata.size -
          1;
      } else {
        /*
         * bytes=0-1023
         * bytes=1024-
         */

        start =
          Number(
            startText
          );

        if (
          !Number.isSafeInteger(
            start
          ) ||
          start < 0 ||
          start >=
            metadata.size
        ) {
          return rangeError();
        }

        if (endText) {
          end =
            Number(
              endText
            );

          if (
            !Number.isSafeInteger(
              end
            ) ||
            end < start
          ) {
            return rangeError();
          }

          end =
            Math.min(
              end,
              metadata.size -
                1
            );
        } else {
          end =
            metadata.size -
            1;
        }
      }

      const length =
        end - start + 1;


      /* -------------------------
         EXPLICIT R2 RANGE
      ------------------------- */

      const object =
        await env.MEDIA.get(
          key,
          {
            range: {
              offset: start,
              length,
            },
          }
        );

      if (
        !object ||
        !("body" in object)
      ) {
        return json(
          {
            error:
              "Media not found.",
          },
          404
        );
      }

      const headers =
        createHeaders();

      headers.set(
        "Content-Length",
        String(length)
      );

      headers.set(
        "Content-Range",
        `bytes ${start}-${end}/${metadata.size}`
      );

      return new Response(
        object.body,
        {
          status: 206,
          headers,
        }
      );
    } catch (error) {
      console.error(
        "Could not load music media",
        error
      );

      return json(
        {
          error:
            "Could not load audio.",
        },
        500
      );
    }
  };


/* -------------------------------------------------------
   UPLOAD LIMITS / VALIDATION HELPERS
------------------------------------------------------- */

const MAX_GALLERY_FILE_SIZE =
  150 * 1024 * 1024;

/*
 * 75 MB maximum audio upload.
 */
const MAX_MUSIC_FILE_SIZE =
  75 * 1024 * 1024;

/*
 * Allow some extra bytes for multipart field
 * boundaries and metadata.
 */
const MULTIPART_OVERHEAD_ALLOWANCE =
  1024 * 1024;


const requestIsTooLarge = (
  request: Request,
  maxFileSize: number
) => {
  const contentLength =
    request.headers.get(
      "content-length"
    );

  if (!contentLength) {
    return false;
  }

  const size =
    Number(
      contentLength
    );

  if (
    !Number.isFinite(size) ||
    size < 0
  ) {
    return false;
  }

  return (
    size >
    maxFileSize +
      MULTIPART_OVERHEAD_ALLOWANCE
  );
};


const asciiAt = (
  bytes: Uint8Array,
  offset: number,
  text: string
) => {
  if (
    offset + text.length >
    bytes.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    if (
      bytes[
        offset + index
      ] !==
      text.charCodeAt(
        index
      )
    ) {
      return false;
    }
  }

  return true;
};


const validateImageSignature =
  async (
    file: File
  ): Promise<boolean> => {
    const bytes =
      new Uint8Array(
        await file
          .slice(0, 64)
          .arrayBuffer()
      );

    /*
     * JPEG
     */
    if (
      file.type ===
      "image/jpeg"
    ) {
      return (
        bytes[0] ===
          0xff &&
        bytes[1] ===
          0xd8 &&
        bytes[2] ===
          0xff
      );
    }

    /*
     * PNG
     */
    if (
      file.type ===
      "image/png"
    ) {
      return (
        bytes[0] ===
          0x89 &&
        asciiAt(
          bytes,
          1,
          "PNG"
        ) &&
        bytes[4] ===
          0x0d &&
        bytes[5] ===
          0x0a &&
        bytes[6] ===
          0x1a &&
        bytes[7] ===
          0x0a
      );
    }

    /*
     * WebP
     */
    if (
      file.type ===
      "image/webp"
    ) {
      return (
        asciiAt(
          bytes,
          0,
          "RIFF"
        ) &&
        asciiAt(
          bytes,
          8,
          "WEBP"
        )
      );
    }

    /*
     * AVIF
     */
    if (
      file.type ===
      "image/avif"
    ) {
      if (
        !asciiAt(
          bytes,
          4,
          "ftyp"
        )
      ) {
        return false;
      }

      const header =
        new TextDecoder(
          "ascii"
        ).decode(
          bytes
        );

      return (
        header.includes(
          "avif"
        ) ||
        header.includes(
          "avis"
        )
      );
    }

    return false;
  };


const validateAudioSignature =
  async (
    file: File
  ): Promise<boolean> => {
    const bytes =
      new Uint8Array(
        await file
          .slice(0, 64)
          .arrayBuffer()
      );

    /*
     * MP3
     */
    if (
      file.type ===
      "audio/mpeg"
    ) {
      const hasId3 =
        asciiAt(
          bytes,
          0,
          "ID3"
        );

      const hasMp3Frame =
        bytes[0] ===
          0xff &&
        (
          bytes[1] &
          0xe0
        ) ===
          0xe0;

      return (
        hasId3 ||
        hasMp3Frame
      );
    }

    /*
     * WAV
     */
    if (
      file.type ===
        "audio/wav" ||
      file.type ===
        "audio/x-wav"
    ) {
      return (
        asciiAt(
          bytes,
          0,
          "RIFF"
        ) &&
        asciiAt(
          bytes,
          8,
          "WAVE"
        )
      );
    }

    /*
     * M4A / MP4 audio
     */
    if (
      file.type ===
        "audio/mp4" ||
      file.type ===
        "audio/x-m4a"
    ) {
      if (
        !asciiAt(
          bytes,
          4,
          "ftyp"
        )
      ) {
        return false;
      }

      const header =
        new TextDecoder(
          "ascii"
        ).decode(
          bytes
        );

      return (
        header.includes(
          "M4A "
        ) ||
        header.includes(
          "M4B "
        ) ||
        header.includes(
          "mp42"
        ) ||
        header.includes(
          "isom"
        )
      );
    }

    return false;
  };


/* -------------------------------------------------------
   GALLERY - ADMIN IMAGE UPLOAD
------------------------------------------------------- */

const adminGalleryUploadHandler =
  async (
    request: Request,
    env: Env
  ) => {
    if (
      request.method !==
      "POST"
    ) {
      return json(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    /*
     * Reject obviously oversized requests
     * before parsing multipart data.
     */
    if (
      requestIsTooLarge(
        request,
        MAX_GALLERY_FILE_SIZE
      )
    ) {
      return json(
        {
          error:
            "Gallery upload is too large.",
        },
        413
      );
    }

    if (
      !request.headers
        .get("content-type")
        ?.includes(
          "multipart/form-data"
        )
    ) {
      return json(
        {
          error:
            "Upload must use multipart/form-data.",
        },
        415
      );
    }

    let uploadedKey:
      string | null = null;

    try {
      const formData =
        await request.formData();

      const file =
        formData.get(
          "file"
        );

      const alt =
        String(
          formData.get(
            "alt"
          ) || ""
        ).trim();

      const requestedCategory =
        String(
          formData.get(
            "category"
          ) || ""
        ).trim();

      const requestedSize =
        String(
          formData.get(
            "size"
          ) || ""
        ).trim();

      if (
        !(
          file instanceof
          File
        )
      ) {
        return json(
          {
            error:
              "An image file is required.",
          },
          400
        );
      }

      if (!alt) {
        return json(
          {
            error:
              "Alt text is required.",
          },
          400
        );
      }

      const allowedTypes:
        Record<
          string,
          string
        > = {
          "image/jpeg":
            "jpg",

          "image/png":
            "png",

          "image/webp":
            "webp",

          "image/avif":
            "avif",
        };

      const extension =
        allowedTypes[
          file.type
        ];

      if (!extension) {
        return json(
          {
            error:
              "Only JPEG, PNG, WebP, and AVIF images are allowed.",
          },
          400
        );
      }

      if (
        file.size >
        MAX_GALLERY_FILE_SIZE
      ) {
        return json(
          {
            error:
              "Image must be 150 MB or smaller.",
          },
          413
        );
      }

      /*
       * Verify actual bytes rather than
       * trusting MIME type alone.
       */
      const validSignature =
        await validateImageSignature(
          file
        );

      if (
        !validSignature
      ) {
        return json(
          {
            error:
              "The uploaded file does not appear to be a valid image.",
          },
          400
        );
      }

      const allowedCategories =
        [
          "live",
          "portraits",
          "behind",
        ];

      const allowedSizes =
        [
          "square",
          "wide",
          "tall",
        ];

      const category =
        allowedCategories.includes(
          requestedCategory
        )
          ? requestedCategory
          : "live";

      const size =
        allowedSizes.includes(
          requestedSize
        )
          ? requestedSize
          : "square";

      const key =
        `gallery/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      uploadedKey =
        key;

      await env.MEDIA.put(
        key,
        file,
        {
          httpMetadata: {
            contentType:
              file.type,

            cacheControl:
              "public, max-age=31536000, immutable",
          },
        }
      );

      const nextOrder =
        await env.DB.prepare(`
          SELECT
            COALESCE(
              MAX(sort_order),
              -1
            ) + 1
            AS next_sort_order
          FROM gallery
        `).first<{
          next_sort_order: number;
        }>();

      const src =
        `/media/${key}`;

      const result =
        await env.DB.prepare(`
          INSERT INTO gallery (
            src,
            avif,
            object_key,
            alt,
            category,
            size,
            sort_order
          )
          VALUES (
            ?,
            NULL,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `)
          .bind(
            src,
            key,
            alt,
            category,
            size,
            nextOrder
              ?.next_sort_order ??
              0
          )
          .run();

      const id =
        Number(
          result.meta
            .last_row_id
        );

      const createdImage =
        await env.DB.prepare(`
          SELECT
            id,
            src,
            avif,
            object_key,
            alt,
            category,
            size,
            sort_order
          FROM gallery
          WHERE id = ?
        `)
          .bind(id)
          .first<GalleryRow>();

      if (
        !createdImage
      ) {
        throw new Error(
          "Gallery record was created but could not be loaded."
        );
      }

      return json(
        mapGalleryRow(
          createdImage
        ),
        201
      );
    } catch (error) {
      console.error(
        "Could not upload gallery image",
        error
      );

      /*
       * Prevent orphaned R2 objects
       * when D1 creation fails.
       */
      if (uploadedKey) {
        try {
          await env.MEDIA.delete(
            uploadedKey
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Could not clean up failed gallery upload",
            cleanupError
          );
        }
      }

      return json(
        {
          error:
            "Could not upload gallery image.",
        },
        500
      );
    }
  };


/* -------------------------------------------------------
   GALLERY - ADMIN ITEM
------------------------------------------------------- */

const adminGalleryItemHandler =
  async (
    request: Request,
    env: Env,
    id: number
  ) => {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return json(
        {
          error:
            "Invalid gallery image ID.",
        },
        400
      );
    }


    /* -------------------------
       UPDATE METADATA
    ------------------------- */

    if (
      request.method === "PUT"
    ) {
      if (
        !request.headers
          .get("content-type")
          ?.includes(
            "application/json"
          )
      ) {
        return json(
          {
            error:
              "Content-Type must be application/json.",
          },
          415
        );
      }

      try {
        const body =
          (await request.json()) as {
            alt?: string;
            category?: string;
            size?: string;
          };

        const alt =
          body.alt?.trim();

        const allowedCategories =
          [
            "live",
            "portraits",
            "behind",
          ];

        const allowedSizes =
          [
            "square",
            "wide",
            "tall",
          ];

        if (!alt) {
          return json(
            {
              error:
                "Alt text is required.",
            },
            400
          );
        }

        if (
          !body.category ||
          !allowedCategories.includes(
            body.category
          )
        ) {
          return json(
            {
              error:
                "Invalid gallery category.",
            },
            400
          );
        }

        if (
          !body.size ||
          !allowedSizes.includes(
            body.size
          )
        ) {
          return json(
            {
              error:
                "Invalid gallery display size.",
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            UPDATE gallery
            SET
              alt = ?,
              category = ?,
              size = ?,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `)
            .bind(
              alt,
              body.category,
              body.size,
              id
            )
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Gallery image not found.",
            },
            404
          );
        }

        const updatedImage =
          await env.DB.prepare(`
            SELECT
              id,
              src,
              avif,
              object_key,
              alt,
              category,
              size,
              sort_order
            FROM gallery
            WHERE id = ?
          `)
            .bind(id)
            .first<GalleryRow>();

        if (
          !updatedImage
        ) {
          return json(
            {
              error:
                "Gallery image not found.",
            },
            404
          );
        }

        return json(
          mapGalleryRow(
            updatedImage
          )
        );
      } catch (error) {
        console.error(
          "Could not update gallery image",
          error
        );

        return json(
          {
            error:
              "Could not update gallery image.",
          },
          500
        );
      }
    }


    /* -------------------------
       DELETE
    ------------------------- */

    if (
      request.method ===
      "DELETE"
    ) {
      try {
        const image =
          await env.DB.prepare(`
            SELECT
              id,
              object_key
            FROM gallery
            WHERE id = ?
          `)
            .bind(id)
            .first<{
              id: number;
              object_key:
                string | null;
            }>();

        if (!image) {
          return json(
            {
              error:
                "Gallery image not found.",
            },
            404
          );
        }

        const result =
          await env.DB.prepare(`
            DELETE FROM gallery
            WHERE id = ?
          `)
            .bind(id)
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Gallery image not found.",
            },
            404
          );
        }

        if (
          image.object_key
        ) {
          try {
            await env.MEDIA.delete(
              image.object_key
            );
          } catch (error) {
            console.error(
              "Gallery row deleted, but R2 cleanup failed",
              {
                id,
                objectKey:
                  image.object_key,
                error,
              }
            );

            return json({
              ok: true,

              warning:
                "Gallery image was removed, but its stored file could not be cleaned up.",
            });
          }
        }

        return json({
          ok: true,
        });
      } catch (error) {
        console.error(
          "Could not delete gallery image",
          error
        );

        return json(
          {
            error:
              "Could not delete gallery image.",
          },
          500
        );
      }
    }

    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  };


/* -------------------------------------------------------
   MUSIC - ADMIN AUDIO UPLOAD
------------------------------------------------------- */

const adminMusicUploadHandler =
  async (
    request: Request,
    env: Env
  ) => {
    if (
      request.method !==
      "POST"
    ) {
      return json(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    /*
     * Reject oversized requests before
     * parsing multipart data.
     */
    if (
      requestIsTooLarge(
        request,
        MAX_MUSIC_FILE_SIZE
      )
    ) {
      return json(
        {
          error:
            "Audio upload is too large.",
        },
        413
      );
    }

    if (
      !request.headers
        .get("content-type")
        ?.includes(
          "multipart/form-data"
        )
    ) {
      return json(
        {
          error:
            "Upload must use multipart/form-data.",
        },
        415
      );
    }

    let uploadedKey:
      string | null = null;

    try {
      const formData =
        await request.formData();

      const file =
        formData.get(
          "file"
        );

      const title =
        String(
          formData.get(
            "title"
          ) || ""
        ).trim();

      const credit =
        String(
          formData.get(
            "credit"
          ) || ""
        ).trim();

      const duration =
        String(
          formData.get(
            "duration"
          ) || ""
        ).trim();

      if (
        !(
          file instanceof
          File
        )
      ) {
        return json(
          {
            error:
              "An audio file is required.",
          },
          400
        );
      }

      if (!title) {
        return json(
          {
            error:
              "Track title is required.",
          },
          400
        );
      }

      const allowedTypes:
        Record<
          string,
          string
        > = {
          "audio/mpeg":
            "mp3",

          "audio/mp4":
            "m4a",

          "audio/x-m4a":
            "m4a",

          "audio/wav":
            "wav",

          "audio/x-wav":
            "wav",
        };

      const extension =
        allowedTypes[
          file.type
        ];

      if (!extension) {
        return json(
          {
            error:
              "Only MP3, M4A, and WAV audio files are allowed.",
          },
          400
        );
      }

      if (
        file.size >
        MAX_MUSIC_FILE_SIZE
      ) {
        return json(
          {
            error:
              "Audio file must be 75 MB or smaller.",
          },
          413
        );
      }

      /*
       * Verify actual bytes rather than
       * trusting MIME type alone.
       */
      const validSignature =
        await validateAudioSignature(
          file
        );

      if (
        !validSignature
      ) {
        return json(
          {
            error:
              "The uploaded file does not appear to be valid audio.",
          },
          400
        );
      }

      const key =
        `music/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      uploadedKey =
        key;

      /*
       * Pass the File directly.
       * This path was confirmed to work
       * correctly for browser uploads.
       */
      await env.MEDIA.put(
        key,
        file,
        {
          httpMetadata: {
            contentType:
              file.type,

            cacheControl:
              "public, max-age=31536000, immutable",
          },
        }
      );

      const nextOrder =
        await env.DB.prepare(`
          SELECT
            COALESCE(
              MAX(sort_order),
              -1
            ) + 1
            AS next_sort_order
          FROM music
        `).first<{
          next_sort_order:
            number;
        }>();

      const audioUrl =
        `/media/${key}`;

      const result =
        await env.DB.prepare(`
          INSERT INTO music (
            title,
            credit,
            duration,
            audio_url,
            audio_key,
            sort_order
          )
          VALUES (
            ?, ?, ?, ?, ?, ?
          )
        `)
          .bind(
            title,
            credit,
            duration,
            audioUrl,
            key,
            nextOrder
              ?.next_sort_order ??
              0
          )
          .run();

      const id =
        Number(
          result.meta
            .last_row_id
        );

      const createdTrack =
        await env.DB.prepare(`
          SELECT
            id,
            title,
            credit,
            duration,
            audio_url,
            audio_key,
            sort_order
          FROM music
          WHERE id = ?
        `)
          .bind(id)
          .first<MusicRow>();

      if (
        !createdTrack
      ) {
        throw new Error(
          "Music record could not be loaded after creation."
        );
      }

      return json(
        mapMusicRow(
          createdTrack
        ),
        201
      );
    } catch (error) {
      console.error(
        "Could not upload music",
        error
      );

      if (uploadedKey) {
        try {
          await env.MEDIA.delete(
            uploadedKey
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Could not clean up failed music upload",
            cleanupError
          );
        }
      }

      return json(
        {
          error:
            "Could not upload audio.",
        },
        500
      );
    }
  };


/* -------------------------------------------------------
   MUSIC - ADMIN ITEM
------------------------------------------------------- */

const adminMusicItemHandler =
  async (
    request: Request,
    env: Env,
    id: number
  ) => {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return json(
        {
          error:
            "Invalid track ID.",
        },
        400
      );
    }


    /* -------------------------
       UPDATE METADATA
    ------------------------- */

    if (
      request.method === "PUT"
    ) {
      if (
        !request.headers
          .get("content-type")
          ?.includes(
            "application/json"
          )
      ) {
        return json(
          {
            error:
              "Content-Type must be application/json.",
          },
          415
        );
      }

      try {
        const body =
          (await request.json()) as {
            title?: string;
            credit?: string;
            duration?: string;
          };

        const title =
          body.title?.trim();

        const credit =
          body.credit
            ?.trim() ||
          "";

        const duration =
          body.duration
            ?.trim() ||
          "";

        if (!title) {
          return json(
            {
              error:
                "Track title is required.",
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            UPDATE music
            SET
              title = ?,
              credit = ?,
              duration = ?,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `)
            .bind(
              title,
              credit,
              duration,
              id
            )
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Track not found.",
            },
            404
          );
        }

        const updatedTrack =
          await env.DB.prepare(`
            SELECT
              id,
              title,
              credit,
              duration,
              audio_url,
              audio_key,
              sort_order
            FROM music
            WHERE id = ?
          `)
            .bind(id)
            .first<MusicRow>();

        if (
          !updatedTrack
        ) {
          return json(
            {
              error:
                "Track not found.",
            },
            404
          );
        }

        return json(
          mapMusicRow(
            updatedTrack
          )
        );
      } catch (error) {
        console.error(
          "Could not update track",
          error
        );

        return json(
          {
            error:
              "Could not update track.",
          },
          500
        );
      }
    }


    /* -------------------------
       DELETE
    ------------------------- */

    if (
      request.method ===
      "DELETE"
    ) {
      try {
        const track =
          await env.DB.prepare(`
            SELECT
              id,
              audio_key
            FROM music
            WHERE id = ?
          `)
            .bind(id)
            .first<{
              id: number;

              audio_key:
                string | null;
            }>();

        if (!track) {
          return json(
            {
              error:
                "Track not found.",
            },
            404
          );
        }

        /*
         * Remove D1 first so the public site
         * never references missing media.
         */
        const result =
          await env.DB.prepare(`
            DELETE FROM music
            WHERE id = ?
          `)
            .bind(id)
            .run();

        if (
          !result.meta.changes
        ) {
          return json(
            {
              error:
                "Track not found.",
            },
            404
          );
        }

        /*
         * Migrated tracks may have no R2
         * object yet.
         */
        if (
          track.audio_key
        ) {
          try {
            await env.MEDIA.delete(
              track.audio_key
            );
          } catch (error) {
            console.error(
              "Music row deleted, but R2 cleanup failed",
              {
                id,
                audioKey:
                  track.audio_key,
                error,
              }
            );

            return json({
              ok: true,

              warning:
                "Track was removed, but its stored audio file could not be cleaned up.",
            });
          }
        }

        return json({
          ok: true,
        });
      } catch (error) {
        console.error(
          "Could not delete track",
          error
        );

        return json(
          {
            error:
              "Could not delete track.",
          },
          500
        );
      }
    }

    return json(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  };


/* -------------------------------------------------------
   ADMIN ORIGIN / CSRF GUARD
------------------------------------------------------- */

const adminMutationOriginGuard =
  (
    request: Request
  ): Response | null => {
    /*
     * Safe/read-only methods don't need
     * CSRF origin enforcement.
     */
    if (
      request.method === "GET" ||
      request.method === "HEAD" ||
      request.method ===
        "OPTIONS"
    ) {
      return null;
    }

    const origin =
      request.headers.get(
        "Origin"
      );

    /*
     * curl and direct API clients often
     * send no Origin header.
     *
     * Cloudflare Access still handles
     * production authentication.
     */
    if (!origin) {
      return null;
    }

    const expectedOrigin =
      new URL(
        request.url
      ).origin;

    if (
      origin !==
      expectedOrigin
    ) {
      return json(
        {
          error:
            "Cross-origin admin requests are not allowed.",
        },
        403
      );
    }

    return null;
  };


/* -------------------------------------------------------
   ROUTING
------------------------------------------------------- */

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url =
      new URL(
        request.url
      );


    /* -------------------------
       ADMIN MUTATION GUARD
    ------------------------- */

    if (
      url.pathname.startsWith(
        "/api/admin/"
      )
    ) {
      const originError =
        adminMutationOriginGuard(
          request
        );

      if (originError) {
        return originError;
      }
    }


    /* -------------------------
       ADMIN API
    ------------------------- */

    if (
      url.pathname ===
      "/api/admin/shows"
    ) {
      return adminShowsHandler(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/admin/gallery/upload"
    ) {
      return adminGalleryUploadHandler(
        request,
        env
      );
    }

    const adminGalleryMatch =
      url.pathname.match(
        /^\/api\/admin\/gallery\/(\d+)$/
      );

    if (
      adminGalleryMatch
    ) {
      return adminGalleryItemHandler(
        request,
        env,
        Number(
          adminGalleryMatch[1]
        )
      );
    }

    if (
      url.pathname ===
      "/api/admin/videos"
    ) {
      return adminVideosHandler(
        request,
        env
      );
    }

    const adminVideoMatch =
      url.pathname.match(
        /^\/api\/admin\/videos\/(\d+)$/
      );

    if (
      adminVideoMatch
    ) {
      return adminVideoItemHandler(
        request,
        env,
        Number(
          adminVideoMatch[1]
        )
      );
    }

    if (
      url.pathname ===
      "/api/admin/music/upload"
    ) {
      return adminMusicUploadHandler(
        request,
        env
      );
    }

    const adminMusicMatch =
      url.pathname.match(
        /^\/api\/admin\/music\/(\d+)$/
      );

    if (
      adminMusicMatch
    ) {
      return adminMusicItemHandler(
        request,
        env,
        Number(
          adminMusicMatch[1]
        )
      );
    }

    const adminShowMatch =
      url.pathname.match(
        /^\/api\/admin\/shows\/(\d+)$/
      );

    if (
      adminShowMatch
    ) {
      return adminShowItemHandler(
        request,
        env,
        Number(
          adminShowMatch[1]
        )
      );
    }


    /* -------------------------
       PUBLIC API
    ------------------------- */

    if (
      url.pathname ===
      "/api/shows"
    ) {
      return showsHandler(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/gallery"
    ) {
      return galleryHandler(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/videos"
    ) {
      return videosHandler(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/music"
    ) {
      return musicHandler(
        request,
        env
      );
    }

    if (
      url.pathname ===
      "/api/booking"
    ) {
      return bookingHandler(
        request,
        env
      );
    }

    /* -------------------------
   UNKNOWN API
------------------------- */

if (
  url.pathname.startsWith(
    "/api/"
  )
) {
  return json(
    {
      error:
        "API route not found.",
    },
    404
  );
}


    /* -------------------------
       R2 MEDIA
    ------------------------- */

    if (
      url.pathname.startsWith(
        "/media/gallery/"
      )
    ) {
      const key =
        url.pathname.slice(
          "/media/".length
        );

      return galleryMediaHandler(
        request,
        env,
        key
      );
    }

    if (
      url.pathname.startsWith(
        "/media/music/"
      )
    ) {
      const key =
        url.pathname.slice(
          "/media/".length
        );

      return musicMediaHandler(
        request,
        env,
        key
      );
    }

    /* -------------------------
   UNKNOWN MEDIA
------------------------- */

if (
  url.pathname.startsWith(
    "/media/"
  )
) {
  return json(
    {
      error:
        "Media not found.",
    },
    404
  );
}
    


    /* -------------------------
       STATIC WEBSITE
    ------------------------- */

    const response =
      await env.ASSETS.fetch(
        request
      );

    const headers =
      new Headers(
        response.headers
      );

    Object.entries(
      securityHeaders
    ).forEach(
      ([key, value]) => {
        headers.set(
          key,
          value
        );
      }
    );

    return new Response(
      response.body,
      {
        status:
          response.status,

        statusText:
          response.statusText,

        headers,
      }
    );
  },
};