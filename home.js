const videoModal = document.querySelector("#videoModal");
const stageVideo = document.querySelector("#stageVideo");
const openVideoButton = document.querySelector("[data-video-open]");
const closeVideoButtons = document.querySelectorAll("[data-video-close]");

function openVideoModal() {
  videoModal.hidden = false;
  document.body.classList.add("has-modal");
  videoModal.querySelector(".video-close").focus();
}

function closeVideoModal() {
  stageVideo.pause();
  videoModal.hidden = true;
  document.body.classList.remove("has-modal");
  openVideoButton.focus();
}

openVideoButton.addEventListener("click", openVideoModal);

closeVideoButtons.forEach((button) => {
  button.addEventListener("click", closeVideoModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !videoModal.hidden) {
    closeVideoModal();
  }
});
