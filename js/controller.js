/* =========================
   UI CONTROLLER (controller.js)
========================= */

const APP_UI = {
  isMenuOpen: window.innerWidth <= 768,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.updateSortUI();
    this.updateMenuUI();
  },

  cacheDOM() {
    this.drawer = document.querySelector("#floatingDrawer");
    this.menuBtn = document.querySelector("#floatingMenuBtn");
    this.fullscreenBtn = document.querySelector("#fullscreenBtn");
    this.fullscreenWrap = document.querySelector("#fullscreenWrap");
    this.sortBtn = document.querySelector("#toggleSort");
    this.controller = document.querySelector(".controller");
  },

  bindEvents() {
    // 메뉴 버튼 클릭
    this.menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isMenuOpen = !this.isMenuOpen;
      this.updateMenuUI();
    });

    // 외부 클릭 시 드로어 닫기
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".controller") && this.isMenuOpen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
      }
    });

    // 전체화면 제어
    this.fullscreenBtn?.addEventListener("click", () =>
      this.toggleFullscreen(),
    );
    document.addEventListener("fullscreenchange", () =>
      this.handleFullscreenChange(),
    );
  },

  updateMenuUI() {
    if (!this.drawer || !this.menuBtn) return;
    const icon = this.menuBtn.querySelector("i");

    this.drawer.classList.toggle("active", this.isMenuOpen);
    this.menuBtn.classList.toggle("active", this.isMenuOpen);
    if (icon) {
      icon.className = this.isMenuOpen
        ? "fa-solid fa-xmark"
        : "fa-solid fa-ellipsis";
    }
  },

  updateSortUI() {
    if (!this.sortBtn) return;
    const isLocked = window.isSortLocked;

    this.sortBtn.className = `drawer-btn ${isLocked ? "is-locked" : "is-unlocked"}`;
    this.sortBtn.innerHTML = `
      <i class="fa-solid fa-${isLocked ? "lock" : "lock-open"}"></i>
      <span>순서 이동 ${isLocked ? "잠금됨" : "가능"}</span>
    `;
  },

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await this.fullscreenWrap?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  },

  handleFullscreenChange() {
    const isFS = !!document.fullscreenElement;
    this.fullscreenBtn.innerHTML = isFS
      ? `<i class="fa-solid fa-compress"></i> <span>닫기</span>`
      : `<i class="fa-solid fa-expand"></i> <span>전체화면</span>`;

    if (!isFS) {
      window.isPlaying = false; // 재생 중단 신호
      this.controller?.classList.remove("is-hidden");
    }
  },
};

// 초기화
document.addEventListener("DOMContentLoaded", () => APP_UI.init());
