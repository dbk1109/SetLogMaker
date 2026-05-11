const APP_UI = {
  // 모바일이면 초기 메뉴 열림 상태로 시작
  isMenuOpen: window.innerWidth <= 768,

  init() {
    this.cacheDOM();
    this.bindEvents();
    
    // 초기 UI 동기화
    this.updateMenuUI();
    this.updateSortUI();
    this.updatePlayBtnUI();
    this.handleFullscreenChange();
  },

  cacheDOM() {
    this.drawer = document.querySelector("#floatingDrawer");
    this.menuBtn = document.querySelector("#floatingMenuBtn");
    this.sortBtn = document.querySelector("#toggleSort");
    this.playBtn = document.querySelector("#playAll");
    this.fullscreenBtn = document.querySelector("#fullscreenBtn");
    this.playNotice = document.querySelector("#playNotice");
    this.playNoticeConfirm = document.querySelector("#playNoticeConfirm");
  },

  bindEvents() {
    // 전체화면
    this.fullscreenBtn?.addEventListener("click", () => {
      const el = document.querySelector("#fullscreenWrap");
      if (!document.fullscreenElement) el?.requestFullscreen().catch(console.error);
      else document.exitFullscreen();
    });

    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // 플로팅 메뉴
    this.menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isMenuOpen = !this.isMenuOpen;
      this.updateMenuUI();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".controller") && this.isMenuOpen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
      }
    });

    // 재생 제어
    this.playBtn?.addEventListener("click", () => {
      if (window.isPlaying) window.APP_CORE.stopPlayback();
      else {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !!document.fullscreenElement) this.playNotice.classList.add("active");
        else window.APP_CORE.startPlayback();
      }
    });

    this.playNoticeConfirm?.addEventListener("click", () => {
      this.playNotice.classList.remove("active");
      document.querySelector(".controller")?.classList.add("is-hidden");
      window.APP_CORE.startPlayback();
    });

    // [중요] 정렬 잠금 토글 및 클래스 부여
    this.sortBtn?.addEventListener("click", () => {
      window.isSortLocked = !window.isSortLocked;
      this.updateSortUI();
      
      // Sortable 객체 상태 업데이트
      ["user1", "user2"].forEach(u => {
        const el = document.querySelector(`#timeline-${u}`);
        if (el?._sortable) el._sortable.option("disabled", window.isSortLocked);
      });
    });

    this.bindSettingEvents();
  },

  updateMenuUI() {
    if (!this.drawer || !this.menuBtn) return;
    this.drawer.classList.toggle("active", this.isMenuOpen);
    this.menuBtn.classList.toggle("active", this.isMenuOpen);
    this.menuBtn.innerHTML = this.isMenuOpen 
      ? `<i class="fa-solid fa-xmark"></i>` 
      : `<i class="fa-solid fa-ellipsis"></i>`;
  },

  handleFullscreenChange() {
    const isFS = !!document.fullscreenElement;
    if (!isFS && window.isPlaying) window.APP_CORE.stopPlayback();
    
    if (this.fullscreenBtn) {
      this.fullscreenBtn.innerHTML = isFS
        ? `<i class="fa-solid fa-compress"></i> <span>닫기</span>`
        : `<i class="fa-solid fa-expand"></i> <span>녹화준비</span>`;
    }
    if (!isFS) document.querySelector(".controller")?.classList.remove("is-hidden");
  },

  updateSortUI() {
    if (!this.sortBtn) return;
    const isLocked = window.isSortLocked;
    
    // 버튼 스타일
    this.sortBtn.className = `drawer-btn ${isLocked ? "is-locked" : "is-unlocked"}`;
    this.sortBtn.innerHTML = isLocked 
      ? `<i class="fa-solid fa-lock"></i> <span>잠금됨</span>`
      : `<i class="fa-solid fa-lock-open"></i> <span>이동 가능</span>`;
    
    // [중요] SCSS 커서 제어를 위해 body에 클래스 토글
    document.body.classList.toggle("sort-unlocked", !isLocked);
  },

  updatePlayBtnUI() {
    if (!this.playBtn) return;
    if (window.isPlaying) {
      this.playBtn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>일시정지</span>`;
    } else {
      this.playBtn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${window.innerWidth <= 768 ? '재생' : '전체 재생'}</span>`;
    }
  },

  updateDots(index) {
    document.querySelectorAll(".Menu--dots span").forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  },

  bindSettingEvents() {
    // 1. 시간제 변경 토글 이벤트 (추가)
    const timeToggle = document.querySelector("#timeFormatToggle");
    timeToggle?.addEventListener("change", (e) => {
      window.APP_CORE.state.is24h = e.target.checked;
      window.APP_CORE.renderAll(); // 전체 다시 렌더링하여 시간 텍스트 교체
    });

    // 텍스트 실시간 반영 (수정 및 최적화)
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("slot-text")) {
        const settingUser = e.target.closest(".SettingUser");
        if (!settingUser) return;
        
        const user = settingUser.dataset.user;
        const itemId = e.target.closest(".Timeline--item").dataset.id;
        
        // [수정] id -> itemId로 변수명 일치 및 할당 확인
        const targetItem = window.APP_CORE.state[user].find(item => item.id === itemId);
        
        if (targetItem) {
          targetItem.text = e.target.value;
          const currentIndex = window.APP_CORE.state[user].indexOf(targetItem);
          
          // 현재 화면에 보이는 visual 업데이트
          window.APP_CORE.syncVisual(user, currentIndex);
          
          // [추가] 프리로드된 비디오의 텍스트도 실시간으로 반영하고 싶다면 
          // syncVisual이 호출될 때 자동으로 처리되므로 별도 추가 로직은 필요 없으나,
          // 오타 수정(id -> itemId)은 반드시 필요합니다.
        }
      }
    });

    // 프로필 업로드
    document.querySelectorAll(".profile-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          const label = e.target.closest(".SettingUser--profile").querySelector(".profile-upload");
          if (label) { label.style.backgroundImage = `url(${url})`; label.textContent = ""; }
          const img = document.querySelector(`#${user} .Videos--users__profile img`);
          if (img) img.src = url;
        }
      });
    });

    // 닉네임
    document.querySelectorAll(".nickname-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const target = document.querySelector(`#${user} .nickname`);
        if (target) target.textContent = e.target.value || user;
      });
    });

    // 영상 일괄 업로드
    document.querySelectorAll(".video-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const files = Array.from(e.target.files).slice(0, 24);
        files.forEach((file, i) => {
          if (window.APP_CORE.state[user][i]) {
            if (window.APP_CORE.state[user][i].videoURL) URL.revokeObjectURL(window.APP_CORE.state[user][i].videoURL);
            window.APP_CORE.state[user][i].videoURL = URL.createObjectURL(file);
          }
        });
        window.APP_CORE.renderTimeline(user);
        window.APP_CORE.syncVisual(user, 0);
      });
    });
    
    // 삭제 버튼
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-video-btn");
      if (!btn) return;
      const { user, id } = btn.dataset;
      const target = window.APP_CORE.state[user].find(item => item.id === id);
      if (target && confirm("해당 영상을 삭제하시겠습니까?")) {
        URL.revokeObjectURL(target.videoURL);
        target.videoURL = "";
        window.APP_CORE.renderTimeline(user);
        window.APP_CORE.syncVisual(user, 0);
      }
    });
  }
};

window.APP_UI = APP_UI;
document.addEventListener("DOMContentLoaded", () => APP_UI.init());