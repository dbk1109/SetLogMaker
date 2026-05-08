/* =========================
   FLOATING MENU
========================= */

const floatingMenuBtn = document.querySelector("#floatingMenuBtn");

const floatingDrawer = document.querySelector("#floatingDrawer");

const isMobile = window.innerWidth <= 768;

let isMenuOpen = isMobile;
window.isSortLocked = isMobile;

/* =========================
   MENU UI
========================= */

function updateFloatingMenu() {
  const icon = floatingMenuBtn.querySelector("i");

  floatingMenuBtn.classList.toggle("active", isMenuOpen);

  if (isMenuOpen) {
    floatingDrawer.classList.add("active");

    icon.className = "fa-solid fa-xmark";
  } else {
    floatingDrawer.classList.remove("active");

    icon.className = "fa-solid fa-ellipsis";
  }
}


floatingMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  isMenuOpen = !isMenuOpen;

  updateFloatingMenu();
});

/* 바깥 클릭 */

document.addEventListener("click", (e) => {
  const inside = e.target.closest(".controller");

  if (!inside && isMenuOpen) {
    isMenuOpen = false;

    updateFloatingMenu();
  }
});

floatingDrawer.addEventListener("click", (e) => {
  e.stopPropagation();
});

/* =========================
   CONTROLLER VISIBILITY
========================= */

const controller = document.querySelector(".controller");

function hideController() {
  controller?.classList.add("is-hidden");
}

function showController() {
  controller?.classList.remove("is-hidden");
}

window.hideController = hideController;
window.showController = showController;

/* =========================
   FULLSCREEN
========================= */

const fullscreenBtn = document.querySelector("#fullscreenBtn");

const fullscreenWrap = document.querySelector("#fullscreenWrap");

function updateFullscreenButton() {
  const isFullscreen = !!document.fullscreenElement;

  if (isFullscreen) {
    fullscreenBtn.innerHTML = `
      <i class="fa-solid fa-compress"></i>
      전체화면 닫기
    `;
  } else {
    fullscreenBtn.innerHTML = `
      <i class="fa-solid fa-expand"></i>
      전체화면
    `;
  }
}

fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await fullscreenWrap.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }

  updateFullscreenButton();
});

/* esc 대응 + fullscreen 종료 처리 */
document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();

  /* fullscreen 종료됨 */
  if (!document.fullscreenElement) {

    /* 재생 강제 종료 */
    if (window.isPlaying) {
      window.isPlaying = false;

      const playBtn = document.querySelector("#playAll");

      if (playBtn) {
        playBtn.textContent = "전체 재생";
      }
    }

    /* 모바일 컨트롤러 복구 */
    controller?.classList.remove("is-hidden");
  }
});

/* =========================
   SORT LOCK
========================= */

const toggleSortBtn = document.querySelector("#toggleSort");

function updateSortButtonUI() {
  if (!toggleSortBtn) return;

  if (window.isSortLocked) {
    toggleSortBtn.classList.remove("is-unlocked");

    toggleSortBtn.classList.add("is-locked");

    toggleSortBtn.innerHTML = `
      <i class="fa-solid fa-lock"></i>
      <span>순서 이동 잠금됨</span>
    `;
  } else {
    toggleSortBtn.classList.remove("is-locked");

    toggleSortBtn.classList.add("is-unlocked");

    toggleSortBtn.innerHTML = `
      <i class="fa-solid fa-lock-open"></i>
      <span>순서 이동 가능</span>
    `;
  }
}

if (toggleSortBtn) {
  toggleSortBtn.addEventListener("click", () => {
    window.isSortLocked = !window.isSortLocked;

    window.updateSortableState();

    updateSortButtonUI();
  });
}

/* =========================
   PLAY NOTICE
========================= */

const playNotice = document.querySelector("#playNotice");

const playNoticeConfirm = document.querySelector("#playNoticeConfirm");

playNoticeConfirm?.addEventListener("click", async () => {
  playNotice?.classList.remove("active");

  await window.startPlayback?.();
});

/* =========================
   초기 실행
========================= */

updateFullscreenButton();
updateFloatingMenu();
updateSortButtonUI();
