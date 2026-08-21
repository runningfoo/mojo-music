const showContainer = document.querySelector("[data-admin-shows]");
const status = document.querySelector("[data-admin-status]");
const showCount = document.querySelector("[data-show-count]");
const addShowButton = document.querySelector("[data-add-show]");
const showForm = document.querySelector("[data-show-form]");
const cancelShowButton = document.querySelector("[data-cancel-show]");
const formMessage = document.querySelector("[data-form-message]");
const adminTabs =
  document.querySelectorAll("[data-admin-tab]");

const adminPanels =
  document.querySelectorAll("[data-admin-panel]");

const galleryContainer =
  document.querySelector("[data-admin-gallery]");

const galleryCount =
  document.querySelector("[data-gallery-count]");

const galleryStatus =
  document.querySelector("[data-gallery-status]");

const addGalleryButton =
  document.querySelector("[data-add-gallery]");

const galleryForm =
  document.querySelector("[data-gallery-form]");

const cancelGalleryButton =
  document.querySelector("[data-cancel-gallery]");

const galleryMessage =
  document.querySelector("[data-gallery-message]");
const videoContainer =
  document.querySelector("[data-admin-videos]");

const videoCount =
  document.querySelector("[data-video-count]");

const videoStatus =
  document.querySelector("[data-video-status]");

const addVideoButton =
  document.querySelector("[data-add-video]");

const videoForm =
  document.querySelector("[data-video-form]");

const cancelVideoButton =
  document.querySelector("[data-cancel-video]");

const videoMessage =
  document.querySelector("[data-video-message]");

const musicContainer =
  document.querySelector("[data-admin-music]");

const musicCount =
  document.querySelector("[data-music-count]");

const musicStatus =
  document.querySelector("[data-music-status]");

const addMusicButton =
  document.querySelector("[data-add-music]");

const musicForm =
  document.querySelector("[data-music-form]");

const cancelMusicButton =
  document.querySelector("[data-cancel-music]");

const musicMessage =
  document.querySelector("[data-music-message]");



let editingShowId = null;
let editingGalleryId = null;
let editingVideoId = null;
let editingMusicId = null;

const formatDate = (value) => {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const createShowRow = (show) => {
  const article = document.createElement("article");
  article.className = "admin-show-row";

  const date = document.createElement("div");
  date.className = "admin-show-date";
  date.textContent = formatDate(show.date);

  const details = document.createElement("div");
  details.className = "admin-show-details";

  const eventName = document.createElement("span");
  eventName.className = "admin-event-name";
  eventName.textContent = show.eventName || "Live Music";

  const venue = document.createElement("h3");
  venue.textContent = show.venue;

  const location = document.createElement("p");
  location.textContent =
    `${show.city}, ${show.state} · ${show.time}`;

  details.append(eventName, venue, location);

  const type = document.createElement("span");
  type.className =
    `admin-show-type ${
      show.type === "private" ? "private" : "public"
    }`;

  type.textContent =
    show.type === "private" ? "Private" : "Public";

  const buttons = document.createElement("div");
  buttons.className = "admin-row-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => {
    openShowForm(show);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    deleteShow(show);
  });

  buttons.append(editButton, deleteButton);

  const controls = document.createElement("div");
  controls.className = "admin-show-controls";
  controls.append(type, buttons);

  article.append(date, details, controls);

  return article;
};

const loadShows = async () => {
  try {
    const response = await fetch("/api/shows");

    if (!response.ok) {
      throw new Error("Could not load shows.");
    }

    const shows = await response.json();

    showContainer.replaceChildren(
      ...shows.map(createShowRow)
    );

    showCount.textContent =
      `${shows.length} show${shows.length === 1 ? "" : "s"}`;

    status.hidden = true;
  } catch (error) {
    console.error(error);

    status.textContent =
      "The show data could not be loaded.";
    status.classList.add("error");
  }
};

const openShowForm = (show = null) => {
  editingShowId = show?.id ?? null;

  showForm.hidden = false;
  addShowButton.hidden = true;
  formMessage.textContent = "";

  const fields = showForm.elements;

  fields.date.value = show?.date ?? "";
  fields.eventName.value = show?.eventName ?? "";
  fields.venue.value = show?.venue ?? "";
  fields.city.value = show?.city ?? "";
  fields.state.value = show?.state ?? "FL";
  fields.time.value = show?.time ?? "";
  fields.type.value = show?.type ?? "public";
  fields.detailsUrl.value = show?.detailsUrl ?? "";

  const submitButton =
    showForm.querySelector('button[type="submit"]');

  submitButton.textContent =
    editingShowId ? "Update Show" : "Save Show";

  fields.date.focus();
};

const closeShowForm = () => {
  editingShowId = null;

  showForm.reset();
  showForm.elements.state.value = "FL";

  showForm.hidden = true;
  addShowButton.hidden = false;
  formMessage.textContent = "";

  const submitButton =
    showForm.querySelector('button[type="submit"]');

  submitButton.textContent = "Save Show";
};


addShowButton.addEventListener("click", () => {
  openShowForm();
});

cancelShowButton.addEventListener("click", closeShowForm);

showForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton =
    showForm.querySelector('button[type="submit"]');

  const formData = new FormData(showForm);
  const payload = Object.fromEntries(formData.entries());

  submitButton.disabled = true;
  submitButton.textContent = "Saving…";
  formMessage.textContent = "";

  try {
    const endpoint = editingShowId
  ? `/api/admin/shows/${editingShowId}`
  : "/api/admin/shows";

const method = editingShowId ? "PUT" : "POST";

const response = await fetch(endpoint, {
  method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not save show."
      );
    }

    closeShowForm();
    await loadShows();
  } catch (error) {
    console.error(error);

    formMessage.textContent =
      error instanceof Error
        ? error.message
        : "Could not save show.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent =
  editingShowId ? "Update Show" : "Save Show";
  }
});

const deleteShow = async (show) => {
  const confirmed = window.confirm(
    `Delete "${show.eventName}" at ${show.venue}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/shows/${show.id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not delete show."
      );
    }

    await loadShows();
  } catch (error) {
    console.error(error);

    window.alert(
      error instanceof Error
        ? error.message
        : "Could not delete show."
    );
  }
};
const activateAdminTab = (name) => {
  adminTabs.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.adminTab === name
    );
  });

  adminPanels.forEach((panel) => {
    panel.hidden =
      panel.dataset.adminPanel !== name;
  });
};

adminTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activateAdminTab(button.dataset.adminTab);
  });
});


const createGalleryCard = (image) => {
  const article =
    document.createElement("article");

  article.className =
    "admin-gallery-card";

  const img =
    document.createElement("img");

  img.src = image.src;
  img.alt = image.alt;
  img.loading = "lazy";

  const info =
    document.createElement("div");

  info.className =
    "admin-gallery-info";

  const alt =
    document.createElement("p");

  alt.textContent = image.alt;

  const meta =
    document.createElement("span");

  meta.textContent =
    `${image.category} · ${image.size}`;

  const actions =
    document.createElement("div");

  actions.className =
    "admin-gallery-actions";

  const editButton =
    document.createElement("button");

  editButton.type = "button";
  editButton.textContent = "Edit";

  editButton.addEventListener(
    "click",
    () => openGalleryEditForm(image)
  );

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className = "delete";
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener(
    "click",
    () => deleteGalleryImage(image)
  );

  actions.append(
    editButton,
    deleteButton
  );

  info.append(
    alt,
    meta,
    actions
  );

  article.append(
    img,
    info
  );

  return article;
};


const loadGallery = async () => {
  try {
    galleryStatus.hidden = false;
    galleryStatus.textContent =
      "Loading gallery…";
    galleryStatus.classList.remove("error");

    const response = await fetch("/api/gallery");

    if (!response.ok) {
      throw new Error(
        "Could not load gallery."
      );
    }

    const images = await response.json();

    galleryContainer.replaceChildren(
      ...images.map(createGalleryCard)
    );

    galleryCount.textContent =
      `${images.length} image${
        images.length === 1 ? "" : "s"
      }`;

    galleryStatus.hidden = true;
  } catch (error) {
    console.error(error);

    galleryStatus.hidden = false;
    galleryStatus.textContent =
      "The gallery could not be loaded.";

    galleryStatus.classList.add("error");
  }
};


const openGalleryForm = () => {
  editingGalleryId = null;

  galleryForm.reset();

  const fileInput =
    galleryForm.elements.file;

  fileInput.disabled = false;
  fileInput.required = true;

  galleryForm.hidden = false;
  addGalleryButton.hidden = true;
  galleryMessage.textContent = "";

  const submitButton =
    galleryForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "Upload Image";
};

const openGalleryEditForm = (image) => {
  editingGalleryId = image.id;

  galleryForm.hidden = false;
  addGalleryButton.hidden = true;
  galleryMessage.textContent = "";

  const fileInput =
    galleryForm.elements.file;

  const altInput =
    galleryForm.elements.alt;

  fileInput.required = false;
  fileInput.disabled = true;

  altInput.value = image.alt;
  galleryForm.elements.category.value =
    image.category;
  galleryForm.elements.size.value =
    image.size;

  const submitButton =
    galleryForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "Update Image";

  altInput.focus();
};


const closeGalleryForm = () => {
  editingGalleryId = null;

  galleryForm.reset();

  const fileInput =
    galleryForm.elements.file;

  fileInput.disabled = false;
  fileInput.required = true;

  galleryForm.hidden = true;
  addGalleryButton.hidden = false;
  galleryMessage.textContent = "";

  const submitButton =
    galleryForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "Upload Image";
};


addGalleryButton.addEventListener(
  "click",
  openGalleryForm
);

cancelGalleryButton.addEventListener(
  "click",
  closeGalleryForm
);


galleryForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const submitButton =
      galleryForm.querySelector(
        'button[type="submit"]'
      );

    submitButton.disabled = true;
    galleryMessage.textContent = "";

    try {
      let response;

      if (editingGalleryId) {
        submitButton.textContent =
          "Updating…";

        const payload = {
          alt:
            galleryForm.elements.alt.value,
          category:
            galleryForm.elements.category.value,
          size:
            galleryForm.elements.size.value,
        };

        response = await fetch(
          `/api/admin/gallery/${editingGalleryId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        submitButton.textContent =
          "Uploading…";

        const formData =
          new FormData(galleryForm);

        response = await fetch(
          "/api/admin/gallery/upload",
          {
            method: "POST",
            body: formData,
          }
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Could not save image."
        );
      }

      closeGalleryForm();
      await loadGallery();
    } catch (error) {
      console.error(error);

      galleryMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not save image.";
    } finally {
      submitButton.disabled = false;

      submitButton.textContent =
        editingGalleryId
          ? "Update Image"
          : "Upload Image";
    }
  }
);

const deleteGalleryImage = async (image) => {
  const confirmed = window.confirm(
    `Delete this image?\n\n${image.alt}`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/gallery/${image.id}`,
      {
        method: "DELETE",
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not delete image."
      );
    }

    await loadGallery();
  } catch (error) {
    console.error(error);

    window.alert(
      error instanceof Error
        ? error.message
        : "Could not delete image."
    );
  }
};

const createVideoCard = (video) => {
  const article =
    document.createElement("article");

  article.className =
    "admin-video-row";

  const preview =
    document.createElement("div");

  preview.className =
    "admin-video-preview";

  if (video.thumbnail) {
    const img =
      document.createElement("img");

    img.src = video.thumbnail;
    img.alt = "";
    img.loading = "lazy";

    preview.append(img);
  } else {
    const placeholder =
      document.createElement("span");

    placeholder.textContent =
      "No thumbnail";

    preview.append(placeholder);
  }

  const details =
    document.createElement("div");

  details.className =
    "admin-video-details";

  const title =
    document.createElement("h3");

  title.textContent = video.title;

  const meta =
    document.createElement("p");

  const parts = [];

  if (video.category) {
    parts.push(video.category);
  }

  parts.push(
    video.youtubeId
      ? "YouTube connected"
      : "Coming soon"
  );

  if (video.featured) {
    parts.push("Featured");
  }

  meta.textContent = parts.join(" · ");

  details.append(title, meta);

  const actions =
    document.createElement("div");

  actions.className =
    "admin-row-actions";

  const editButton =
    document.createElement("button");

  editButton.type = "button";
  editButton.textContent = "Edit";

  editButton.addEventListener(
    "click",
    () => openVideoForm(video)
  );

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className = "delete";
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener(
    "click",
    () => deleteVideo(video)
  );

  actions.append(
    editButton,
    deleteButton
  );

  article.append(
    preview,
    details,
    actions
  );

  return article;
};

const loadVideos = async () => {
  try {
    videoStatus.hidden = false;
    videoStatus.textContent =
      "Loading videos…";

    videoStatus.classList.remove(
      "error"
    );

    const response =
      await fetch("/api/videos");

    if (!response.ok) {
      throw new Error(
        "Could not load videos."
      );
    }

    const videos =
      await response.json();

    videoContainer.replaceChildren(
      ...videos.map(createVideoCard)
    );

    videoCount.textContent =
      `${videos.length} video${
        videos.length === 1 ? "" : "s"
      }`;

    videoStatus.hidden = true;
  } catch (error) {
    console.error(error);

    videoStatus.hidden = false;
    videoStatus.textContent =
      "The videos could not be loaded.";

    videoStatus.classList.add(
      "error"
    );
  }
};

const openVideoForm = (video = null) => {
  editingVideoId =
    video?.id ?? null;

  videoForm.reset();

  videoForm.elements.title.value =
    video?.title ?? "";

  videoForm.elements.youtube.value =
    video?.youtubeId ?? "";

  videoForm.elements.category.value =
    video?.category ?? "";

  videoForm.elements.thumbnail.value =
    video?.thumbnail ?? "";

  videoForm.elements.featured.checked =
    Boolean(video?.featured);

  videoForm.hidden = false;
  addVideoButton.hidden = true;
  videoMessage.textContent = "";

  const submitButton =
    videoForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    editingVideoId
      ? "Update Video"
      : "Save Video";

  videoForm.elements.title.focus();
};


const closeVideoForm = () => {
  editingVideoId = null;

  videoForm.reset();

  videoForm.hidden = true;
  addVideoButton.hidden = false;
  videoMessage.textContent = "";

  const submitButton =
    videoForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "Save Video";
};


addVideoButton.addEventListener(
  "click",
  () => openVideoForm()
);

cancelVideoButton.addEventListener(
  "click",
  closeVideoForm
);

videoForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const submitButton =
      videoForm.querySelector(
        'button[type="submit"]'
      );

    const payload = {
      title:
        videoForm.elements.title.value,

      youtube:
        videoForm.elements.youtube.value,

      category:
        videoForm.elements.category.value,

      thumbnail:
        videoForm.elements.thumbnail.value,

      featured:
        videoForm.elements.featured.checked,
    };

    const endpoint =
      editingVideoId
        ? `/api/admin/videos/${editingVideoId}`
        : "/api/admin/videos";

    const method =
      editingVideoId
        ? "PUT"
        : "POST";

    submitButton.disabled = true;

    submitButton.textContent =
      editingVideoId
        ? "Updating…"
        : "Saving…";

    videoMessage.textContent = "";

    try {
      const response =
        await fetch(
          endpoint,
          {
            method,
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(payload),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Could not save video."
        );
      }

      closeVideoForm();

      await loadVideos();
    } catch (error) {
      console.error(error);

      videoMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not save video.";
    } finally {
      submitButton.disabled = false;

      submitButton.textContent =
        editingVideoId
          ? "Update Video"
          : "Save Video";
    }
  }
);

const deleteVideo = async (video) => {
  const confirmed =
    window.confirm(
      `Delete "${video.title}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `/api/admin/videos/${video.id}`,
        {
          method: "DELETE",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not delete video."
      );
    }

    await loadVideos();
  } catch (error) {
    console.error(error);

    window.alert(
      error instanceof Error
        ? error.message
        : "Could not delete video."
    );
  }
};

const createMusicRow = (track) => {
  const article =
    document.createElement("article");

  article.className =
    "admin-music-row";

  const details =
    document.createElement("div");

  details.className =
    "admin-music-details";

  const title =
    document.createElement("h3");

  title.textContent = track.title;

  const meta =
    document.createElement("p");

  const parts = [];

  if (track.credit) {
    parts.push(track.credit);
  }

  if (track.duration) {
    parts.push(track.duration);
  }

  parts.push(
    track.audioUrl
      ? "Audio available"
      : "Coming soon"
  );

  meta.textContent = parts.join(" · ");

  details.append(title, meta);

  const player =
    document.createElement("div");

  player.className =
    "admin-music-player";

  if (track.audioUrl) {
    const audio =
      document.createElement("audio");

    audio.controls = true;
    audio.preload = "metadata";
    audio.src = track.audioUrl;

    player.append(audio);
  } else {
    const unavailable =
      document.createElement("span");

    unavailable.textContent =
      "No audio file";

    player.append(unavailable);
  }

  const actions =
    document.createElement("div");

  actions.className =
    "admin-row-actions";

  const editButton =
    document.createElement("button");

  editButton.type = "button";
  editButton.textContent = "Edit";

  editButton.addEventListener(
    "click",
    () => openMusicForm(track)
  );

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className = "delete";
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener(
    "click",
    () => deleteMusicTrack(track)
  );

  actions.append(
    editButton,
    deleteButton
  );

  article.append(
    details,
    player,
    actions
  );

  return article;
};

const loadMusic = async () => {
  try {
    musicStatus.hidden = false;
    musicStatus.textContent =
      "Loading music…";

    musicStatus.classList.remove(
      "error"
    );

    const response =
      await fetch("/api/music");

    if (!response.ok) {
      throw new Error(
        "Could not load music."
      );
    }

    const tracks =
      await response.json();

    musicContainer.replaceChildren(
      ...tracks.map(createMusicRow)
    );

    musicCount.textContent =
      `${tracks.length} track${
        tracks.length === 1 ? "" : "s"
      }`;

    musicStatus.hidden = true;
  } catch (error) {
    console.error(error);

    musicStatus.hidden = false;
    musicStatus.textContent =
      "The music could not be loaded.";

    musicStatus.classList.add(
      "error"
    );
  }
};

const openMusicForm = (track = null) => {
  editingMusicId =
    track?.id ?? null;

  musicForm.reset();

  const fileInput =
    musicForm.elements.file;

  if (editingMusicId) {
    fileInput.disabled = true;
    fileInput.required = false;
  } else {
    fileInput.disabled = false;
    fileInput.required = true;
  }

  musicForm.elements.title.value =
    track?.title ?? "";

  musicForm.elements.credit.value =
    track?.credit ?? "";

  musicForm.elements.duration.value =
    track?.duration ?? "";

  musicForm.hidden = false;
  addMusicButton.hidden = true;
  musicMessage.textContent = "";

  const submitButton =
    musicForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    editingMusicId
      ? "Update Track"
      : "Upload Track";

  musicForm.elements.title.focus();
};


const closeMusicForm = () => {
  editingMusicId = null;

  musicForm.reset();

  const fileInput =
    musicForm.elements.file;

  fileInput.disabled = false;
  fileInput.required = true;

  musicForm.hidden = true;
  addMusicButton.hidden = false;
  musicMessage.textContent = "";

  const submitButton =
    musicForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.textContent =
    "Upload Track";
};


addMusicButton.addEventListener(
  "click",
  () => openMusicForm()
);

cancelMusicButton.addEventListener(
  "click",
  closeMusicForm
);

musicForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const submitButton =
      musicForm.querySelector(
        'button[type="submit"]'
      );

    submitButton.disabled = true;
    musicMessage.textContent = "";

    try {
      let response;

      if (editingMusicId) {
        submitButton.textContent =
          "Updating…";

        const payload = {
          title:
            musicForm.elements.title.value,

          credit:
            musicForm.elements.credit.value,

          duration:
            musicForm.elements.duration.value,
        };

        response = await fetch(
          `/api/admin/music/${editingMusicId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(payload),
          }
        );
      } else {
        submitButton.textContent =
          "Uploading…";

        const formData =
          new FormData(musicForm);

        response = await fetch(
          "/api/admin/music/upload",
          {
            method: "POST",
            body: formData,
          }
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Could not save track."
        );
      }

      closeMusicForm();

      await loadMusic();
    } catch (error) {
      console.error(error);

      musicMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not save track.";
    } finally {
      submitButton.disabled = false;

      submitButton.textContent =
        editingMusicId
          ? "Update Track"
          : "Upload Track";
    }
  }
);

const deleteMusicTrack = async (track) => {
  const confirmed =
    window.confirm(
      `Delete "${track.title}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `/api/admin/music/${track.id}`,
        {
          method: "DELETE",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not delete track."
      );
    }

    await loadMusic();
  } catch (error) {
    console.error(error);

    window.alert(
      error instanceof Error
        ? error.message
        : "Could not delete track."
    );
  }
};

loadShows();
loadGallery();
loadVideos();
loadMusic();