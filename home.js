const videoModal = document.querySelector("#videoModal");
const stageVideo = document.querySelector("#stageVideo");
const videoTitle = document.querySelector("#videoTitle");
const openVideoButtons = document.querySelectorAll("[data-video-open]");
const closeVideoButtons = document.querySelectorAll("[data-video-close]");
let lastVideoButton = null;

function openVideoModal(button) {
  lastVideoButton = button;
  stageVideo.src = button.dataset.videoSrc;
  videoTitle.textContent = button.dataset.videoTitle;
  stageVideo.load();
  videoModal.hidden = false;
  document.body.classList.add("has-modal");
  videoModal.querySelector(".video-close").focus();
}

function closeVideoModal() {
  stageVideo.pause();
  stageVideo.removeAttribute("src");
  stageVideo.load();
  videoModal.hidden = true;
  document.body.classList.remove("has-modal");
  lastVideoButton?.focus();
}

openVideoButtons.forEach((button) => {
  button.addEventListener("click", () => openVideoModal(button));
});

closeVideoButtons.forEach((button) => {
  button.addEventListener("click", closeVideoModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !videoModal.hidden) {
    closeVideoModal();
  }
});

videoModal.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || videoModal.hidden) return;

  const focusables = [...videoModal.querySelectorAll("button, video, [href]")].filter(
    (el) => !el.hidden && el.offsetParent !== null,
  );
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
