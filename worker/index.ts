interface BookingEmailBinding {
  send(message: {
    to?: string | string[];
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
}

type Booking = Record<string, string>;

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...securityHeaders },
});

const clean = (value: unknown, max = 300) => String(value ?? "")
  .replace(/[<>]/g, "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .trim()
  .slice(0, max);

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] || character);

const readBooking = (input: Record<string, unknown>): Booking => ({
  name: clean(input.name, 100),
  email: clean(input.email, 160).toLowerCase(),
  phone: clean(input.phone, 40),
  eventType: clean(input.eventType, 80),
  eventDate: clean(input.eventDate, 20),
  location: clean(input.location, 180),
  audience: clean(input.audience, 12),
  message: clean(input.message, 3000),
  website: clean(input.website, 200),
  startedAt: clean(input.startedAt, 30),
});

const bookingHandler = async (request: Request, env: Env) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Please send a valid form request." }, 415);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 12_000) return json({ error: "That message is too large." }, 413);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Please send a valid form request." }, 400);
  }

  const booking = readBooking(input);
  if (booking.website) return json({ ok: true });
  const startedAt = Number(booking.startedAt);
  if (!startedAt || Date.now() - startedAt < 2500) return json({ error: "Please take a moment and try again." }, 429);
  if (!booking.name || !booking.email || !booking.eventType || !booking.message) return json({ error: "Please complete every required field." }, 400);
  if (!validEmail(booking.email)) return json({ error: "Please enter a valid email address." }, 400);
  if ((booking.message.match(/https?:\/\//gi) || []).length > 2 || /(casino|crypto|backlink|seo service)/i.test(booking.message)) return json({ error: "Your message could not be accepted." }, 400);

  const url = new URL(request.url);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!env.EMAIL) {
    if (isLocal) return json({ ok: true, delivery: "preview" });
    return json({ error: "Online booking is being configured. Please try again soon." }, 503);
  }

  const rows = [
    ["Name", booking.name], ["Email", booking.email], ["Phone", booking.phone || "Not provided"],
    ["Event type", booking.eventType], ["Date", booking.eventDate || "Not provided"],
    ["Location", booking.location || "Not provided"], ["Audience", booking.audience || "Not provided"],
    ["Message", booking.message],
  ];
  const html = `<h1>New MOJO booking inquiry</h1>${rows.map(([label, value]) => `<p><strong>${label}:</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`).join("")}`;
  const text = `New MOJO booking inquiry\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n\n")}`;
  try {
    await env.EMAIL.send({
      from: "MOJO Website <booking@mojomusic.org>",
      replyTo: booking.email,
      subject: `MOJO booking inquiry — ${booking.eventType}`,
      html,
      text,
    });
  } catch {
    return json({ error: "We couldn't send your inquiry just now. Please try again." }, 502);
  }
  return json({ ok: true });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/booking") return bookingHandler(request, env);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    Object.entries(securityHeaders).forEach(([key, value]) => headers.set(key, value));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
