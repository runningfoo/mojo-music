const menuButton = document.querySelector(".menu-toggle");
const header = document.querySelector("[data-header]");

menuButton?.addEventListener("click", () => {
  const open = header.classList.toggle("menu-open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const loadJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
};

const htmlEscape = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);

const formatShow = (show) => {
  const date = new Date(`${show.date}T12:00:00`);
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date);
  const action = show.type === "private"
    ? '<span class="show-private">Private event</span>'
    : show.detailsUrl
      ? `<a class="text-link" href="${htmlEscape(show.detailsUrl)}">View details <span>↗</span></a>`
      : '<span class="show-note">Public event · details at venue</span>';
  return `<article class="show-row"><time datetime="${htmlEscape(show.date)}"><span>${month}</span><strong>${day}</strong></time><div class="show-name"><p>${htmlEscape(show.eventName || "Live Music")}</p><h3>${htmlEscape(show.venue)}</h3></div><div class="show-place"><p>${htmlEscape(show.city)}, ${htmlEscape(show.state)}</p><strong>${htmlEscape(show.time)}</strong></div><div class="show-action">${action}</div></article>`;
};

document.querySelectorAll("[data-shows]").forEach(async (container) => {
  try {
    const shows = await loadJson("/data/shows.json");
    const sorted = shows.sort((a, b) => a.date.localeCompare(b.date));
    const limit = Number(container.dataset.limit || sorted.length);
    container.innerHTML = sorted.slice(0, limit).map(formatShow).join("");
  } catch {
    container.innerHTML = '<p class="data-error">Show dates are being updated. Please check back soon.</p>';
  }
});

const renderTrack = (track, index) => `<article class="track-row"><button class="track-play" type="button" data-audio-url="${htmlEscape(track.audioUrl)}" aria-label="Play ${htmlEscape(track.title)}">${String(index + 1).padStart(2, "0")} <span>▶</span></button><div><h3>${htmlEscape(track.title)}</h3><p>${htmlEscape(track.credit)}</p></div><span class="track-wave" aria-hidden="true">▂▅▃▆▂▇▅▃▆▂▅▃</span><time>${htmlEscape(track.duration)}</time></article>`;

document.querySelectorAll("[data-tracks]").forEach(async (container) => {
  try {
    const tracks = await loadJson("/data/music.json");
    const limit = Number(container.dataset.limit || tracks.length);
    container.innerHTML = tracks.slice(0, limit).map(renderTrack).join("");
    container.querySelectorAll(".track-play").forEach((button) => button.addEventListener("click", () => {
      if (!button.dataset.audioUrl) {
        button.closest(".track-row").querySelector("p").textContent = "Audio master coming soon · sample listing";
        return;
      }
      const audio = new Audio(button.dataset.audioUrl);
      audio.play();
    }));
  } catch {
    container.innerHTML = '<p class="data-error">Music is being updated.</p>';
  }
});

const activateVideo = (card) => {
  const youtubeId = card.dataset.youtubeId;
  if (!youtubeId) {
    const button = card.querySelector(".play-button");
    button.innerHTML = '<span class="coming-soon">Video coming soon</span>';
    button.setAttribute("aria-label", "Video coming soon");
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;
  iframe.title = card.querySelector("img")?.alt || "MOJO performance";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  card.replaceChildren(iframe);
};

document.querySelectorAll("[data-video]").forEach((card) => {
  card.querySelector(".play-button")?.addEventListener("click", () => activateVideo(card));
});

const videosContainer = document.querySelector("[data-videos]");
let videoData = [];
const renderVideos = (filter = "all") => {
  if (!videosContainer) return;
  videosContainer.innerHTML = videoData.filter((video) => filter === "all" || video.category === filter).map((video) => `<article class="video-card video-tile" data-video data-youtube-id="${htmlEscape(video.youtubeId)}"><img src="${htmlEscape(video.thumbnail)}" alt="${htmlEscape(video.title)} video thumbnail" loading="lazy"><button class="play-button" type="button" aria-label="Play ${htmlEscape(video.title)}"><span>▶</span></button><div class="video-meta"><span>${htmlEscape(video.category)}</span><h3>${htmlEscape(video.title)}</h3></div></article>`).join("");
  videosContainer.querySelectorAll("[data-video]").forEach((card) => card.querySelector(".play-button")?.addEventListener("click", () => activateVideo(card)));
};

if (videosContainer) {
  loadJson("/data/videos.json").then((videos) => { videoData = videos; renderVideos(); }).catch(() => { videosContainer.innerHTML = '<p class="data-error">Videos are being updated.</p>'; });
  document.querySelectorAll("[data-video-filters] button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-video-filters] button").forEach((item) => item.classList.toggle("active", item === button));
    renderVideos(button.dataset.filter);
  }));
}

const galleryContainer = document.querySelector("[data-gallery]");
const lightbox = document.querySelector("[data-lightbox]");
let galleryData = [];
let visibleGallery = [];
let activeImage = 0;

const updateLightbox = () => {
  const image = visibleGallery[activeImage];
  if (!image || !lightbox) return;
  lightbox.querySelector("[data-lightbox-image]").src = image.src;
  lightbox.querySelector("[data-lightbox-image]").alt = image.alt;
  lightbox.querySelector("[data-lightbox-source]").srcset = image.avif;
  lightbox.querySelector("[data-lightbox-caption]").textContent = `${activeImage + 1} / ${visibleGallery.length} — ${image.alt}`;
};

const openLightbox = (index) => {
  activeImage = index;
  updateLightbox();
  lightbox.showModal();
};

const moveLightbox = (direction) => {
  activeImage = (activeImage + direction + visibleGallery.length) % visibleGallery.length;
  updateLightbox();
};

const renderGallery = (filter = "all") => {
  visibleGallery = galleryData.filter((image) => filter === "all" || image.category === filter);
  galleryContainer.innerHTML = visibleGallery.map((image, index) => `<button class="gallery-item gallery-${htmlEscape(image.size)}" type="button" data-gallery-index="${index}" aria-label="Open image: ${htmlEscape(image.alt)}"><picture><source srcset="${htmlEscape(image.avif)}" type="image/avif"><img src="${htmlEscape(image.src)}" alt="${htmlEscape(image.alt)}" loading="lazy"></picture><span>View image ↗</span></button>`).join("");
  galleryContainer.querySelectorAll("[data-gallery-index]").forEach((button) => button.addEventListener("click", () => openLightbox(Number(button.dataset.galleryIndex))));
};

if (galleryContainer && lightbox) {
  loadJson("/data/gallery.json").then((images) => { galleryData = images; renderGallery(); }).catch(() => { galleryContainer.innerHTML = '<p class="data-error">The gallery is being updated.</p>'; });
  document.querySelectorAll("[data-gallery-filters] button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-gallery-filters] button").forEach((item) => item.classList.toggle("active", item === button));
    renderGallery(button.dataset.filter);
  }));
  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => moveLightbox(-1));
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => moveLightbox(1));
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") moveLightbox(-1);
    if (event.key === "ArrowRight") moveLightbox(1);
    if (event.key === "Escape") lightbox.close();
  });
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.close(); });
}

const bookingForm = document.querySelector("[data-booking-form]");
if (bookingForm) {
  bookingForm.querySelector("[data-started-at]").value = String(Date.now());
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = bookingForm.querySelector("[data-form-status]");
    if (!bookingForm.checkValidity()) {
      bookingForm.reportValidity();
      status.textContent = "Please complete the required fields and check your email address.";
      status.className = "form-status error";
      return;
    }
    const button = bookingForm.querySelector("button[type='submit']");
    button.disabled = true;
    status.textContent = "Sending your inquiry…";
    status.className = "form-status";
    try {
      const payload = Object.fromEntries(new FormData(bookingForm));
      const response = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't send your inquiry.");
      bookingForm.reset();
      status.textContent = "Thanks! Your inquiry has been sent. MOJO will be in touch soon.";
      status.className = "form-status success";
    } catch (error) {
      status.textContent = error.message || "Something went wrong. Please try again.";
      status.className = "form-status error";
    } finally {
      button.disabled = false;
    }
  });
}
