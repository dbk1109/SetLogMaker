/* =========================
   UI CONTROLLER (controller.js)
========================= */

const APP_UI = {
  isMenuOpen: window.innerWidth <= 768,

  init() {
    console.log("UI INIT OK");
    this.cacheDOM();
    this.bindEvents();

    // [수정] 실행 순서 보장: DOM 캐시 후 즉시 모든 UI 텍스트 업데이트
    this.handleFullscreenChange();
    this.updateSortUI();
    this.updateMenuUI();
    this.bindPlayNotice();

    // [중요] CORE가 먼저 로드되었다면 재생 버튼 텍스트 강제 업데이트
    if (window.APP_CORE) {
      window.APP_CORE.updatePlayBtnUI();
    }
  },

  cacheDOM() {
    this.drawer = document.querySelector("#floatingDrawer");
    this.menuBtn = document.querySelector("#floatingMenuBtn");
    this.fullscreenBtn = document.querySelector("#fullscreenBtn");
    this.fullscreenWrap = document.querySelector("#fullscreenWrap");
    this.sortBtn = document.querySelector("#toggleSort");
    this.controller = document.querySelector(".controller");
    this.playNotice = document.querySelector("#playNotice");
    this.playNoticeConfirm = document.querySelector("#playNoticeConfirm");
  },

  bindEvents() {
    // 메뉴 버튼 클릭
    this.menuBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.isMenuOpen = !this.isMenuOpen;
      this.updateMenuUI();
    });

    // 외부 클릭 시 드로어 닫기
    document.addEventListener("click", (e) => {
      // 클릭된 요소가 컨트롤러(#floatingDrawer, #floatingMenuBtn 등 포함) 내부인지 확인
      const isInsideController = e.target.closest(".controller");

      // 컨트롤러 밖을 클릭했고, 현재 메뉴가 열려있을 때만 닫기
      if (!isInsideController && this.isMenuOpen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
      }
    });

    // 전체화면 제어
    this.fullscreenBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const el = this.fullscreenWrap;

      if (!document.fullscreenElement) {
        el?.requestFullscreen?.().catch(console.error);
      } else {
        document.exitFullscreen?.();
      }
    });
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

    // [수정] window.isSortLocked 상태를 가져와서 아이콘과 텍스트 결정
    const isLocked = window.isSortLocked;

    this.sortBtn.className = `drawer-btn ${isLocked ? "is-locked" : "is-unlocked"}`;
    this.sortBtn.innerHTML = `
      <i class="fa-solid fa-${isLocked ? "lock" : "lock-open"}"></i>
      <span>순서 이동 ${isLocked ? "잠금됨" : "가능"}</span>
    `;
  },

  updateDraggableUI() {
    document.body.classList.toggle("sort-unlocked", !window.isSortLocked);
  },

  toggleFullscreen() {
    const el = this.fullscreenWrap;

    if (!document.fullscreenElement) {
      el?.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.();
    }
  },

  handleFullscreenChange() {
    const isFS = !!document.fullscreenElement;

    if (this.fullscreenBtn) {
      this.fullscreenBtn.innerHTML = isFS
        ? `<i class="fa-solid fa-compress"></i> <span>닫기</span>`
        : `<i class="fa-solid fa-expand"></i> <span>녹화준비</span>`;
    }

    if (!isFS && window.isPlaying) {
      // 사용자가 직접 ESC를 누르거나 FS를 나갔을 때만 정지하도록 설계
      // 만약 알림창(alert) 등으로 풀리는 게 문제라면 이 로직을 검토해야 함
    }

    if (!isFS && this.controller) {
      this.controller.classList.remove("is-hidden");
    }
  },

  syncSortState() {
    this.updateSortUI(); // 버튼 텍스트/아이콘 변경
    this.updateDraggableUI(); // 타임라인 클래스 변경
  },

  bindPlayNotice() {
    console.log("🔍 STEP 1: bindPlayNotice 함수 진입");

    if (!this.playNotice || !this.playNoticeConfirm) {
      console.error("❌ 에러: playNotice 또는 Confirm 버튼을 찾을 수 없음");
      return;
    }

    const playBtn = document.querySelector("#playAll");
    console.log("🔍 STEP 2: 재생 버튼 찾기 결과 ->", playBtn);

    this.playNoticeConfirm.addEventListener("click", () => {
      console.log("🔍 STEP 6: 안내창 확인 버튼 클릭됨");
      this.playNotice.classList.remove("active");
      this.controller?.classList.add("is-hidden");
      window.APP_CORE?.startPlayback?.();
    });

    playBtn?.addEventListener("click", (e) => {
      console.log("🔍 STEP 3: 재생 버튼 클릭 이벤트 발생!");

      e.preventDefault();
      e.stopPropagation();

      console.log(
        "🔍 STEP 4: 현재 재생 상태(window.isPlaying) ->",
        window.isPlaying,
      );

      if (window.isPlaying) {
        console.log("🔍 STEP 5-A: 이미 재생 중임 -> 정지 실행");
        window.APP_CORE?.stopPlayback?.();
        return;
      }

      const isMobile = window.innerWidth <= 768;
      const isFS = !!document.fullscreenElement;
      console.log(
        `🔍 STEP 5-B: 환경 체크 - 모바일: ${isMobile}, 전체화면: ${isFS}`,
      );

      if (isMobile && isFS) {
        console.log("🔍 STEP 5-C: 모바일 전체화면 조건 만족 -> 안내창 표시");
        this.playNotice.classList.add("active");
      } else {
        console.log("🔍 STEP 5-D: 일반 조건 -> 바로 재생 실행");
        if (!window.APP_CORE)
          console.error("❌ 에러: window.APP_CORE가 존재하지 않음");
        window.APP_CORE?.startPlayback?.();
      }
    });
  },
};

// 초기화
window.APP_UI = APP_UI;

function bootUI() {
  window.APP_UI?.init?.();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootUI);
} else {
  bootUI();
}