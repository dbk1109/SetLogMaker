/* =========================
   CONTROLLER UI
   controller2.js
========================= */


/* =========================
  INDEXEDDB VIDEO STORAGE
========================= */
const VideoDB = {
  DB_NAME: "SetlogVideoDB",
  STORE_NAME: "videos",

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(this.STORE_NAME);
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async save(slotId, user, file) {
    if (!file) return;
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).put(file, `${slotId}_${user}`);
  },

  async load(slotId, user) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const request = tx.objectStore(this.STORE_NAME).get(`${slotId}_${user}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  },

  async delete(slotId, user) {
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).delete(`${slotId}_${user}`);
  },

  async clear() {
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).clear();
  },
};

const APP_UI = {
  isMenuOpen: window.innerWidth <= 768,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadFromLocalStorage();

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
    // 전체화면 토글
    this.fullscreenBtn?.addEventListener("click", () => {
      const el = document.querySelector("#fullscreenWrap");
      if (!el) return;

      if (el.requestFullscreen) {
        if (!document.fullscreenElement) {
          el.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      } else {
        el.classList.toggle("ios-fullscreen");
        window.scrollTo(0, 0);
      }
    });

    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // 플로팅 메뉴 제어
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

    // 전체 재생 트리거
    this.playBtn?.addEventListener("click", () => {
      const isMobile = window.innerWidth <= 768;
      const el = document.querySelector("#fullscreenWrap");
      const isFullscreen = !!document.fullscreenElement || el?.classList.contains("ios-fullscreen");

      if (window.isPlaying) {
        window.APP_CORE.stopPlayback();
        return;
      }

      if (isMobile && isFullscreen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
        if (this.playNotice) {
          this.playNotice.classList.add("active");
        } else {
          window.APP_CORE.startPlayback();
        }
      } else {
        window.APP_CORE.startPlayback();
      }
    });

    this.playNoticeConfirm?.addEventListener("click", () => {
      if (this.playNotice) this.playNotice.classList.remove("active");
      document.body.classList.add("is-playing");
      window.APP_CORE.startPlayback();
    });

    // 드래그 앤 드롭 정렬 잠금 토글
    this.sortBtn?.addEventListener("click", () => {
      window.isSortLocked = !window.isSortLocked;
      this.updateSortUI();

      ["user1", "user2"].forEach((u) => {
        const el = document.querySelector(`#timeline-${u}`);
        if (el?._sortable) el._sortable.option("disabled", window.isSortLocked);
      });
    });

    this.bindDynamicEvents();
  },

  bindDynamicEvents() {
    // 1. 타임라인 내부 비디오 추가 및 상단 일괄 업로드 처리
    document.addEventListener("change", async (e) => {
      if (e.target.matches(".btn--upload input")) {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        const user = input.dataset.user;
        const index = Number(input.dataset.index);
        const slot = window.APP_CORE.state.slots[index];
        if (!slot) return;

        if (slot[user].videoURL) URL.revokeObjectURL(slot[user].videoURL);

        slot[user].video = file;
        slot[user].videoURL = URL.createObjectURL(file);

        await VideoDB.save(slot.id, user, file);

        window.APP_CORE.renderTimeline();
        window.APP_CORE.updateCurrentVisual();
        this.saveToLocalStorage();
      }
    });

    // 2. 텍스트 실시간 반영 (HTML 매칭 완화)
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("slot-text")) {
        const input = e.target;
        const user = input.dataset.user || (input.closest("#timeline-user1") ? "user1" : "user2");
        const index = Number(input.dataset.index);
        const slot = window.APP_CORE.state.slots[index];

        if (slot) {
          slot[user].text = input.value;
          if (window.APP_CORE.currentIndex === index) {
            window.APP_CORE.syncVisual(index);
          }
        }
      }
    });

    // 3. 비디오 단일 삭제 제어
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".delete-video-btn, .btn--delete_video");
      if (!btn) return;

      const user = btn.dataset.user || (btn.closest("#timeline-user1") ? "user1" : "user2");
      const index = Number(btn.dataset.index);
      
      const slot = window.APP_CORE.state.slots[index];
      if (slot && confirm("해당 영상을 삭제하시겠습니까?")) {
        if (slot[user].videoURL) URL.revokeObjectURL(slot[user].videoURL);
        slot[user].video = null;
        slot[user].videoURL = "";
        
        await VideoDB.delete(slot.id, user);

        window.APP_CORE.renderTimeline();
        window.APP_CORE.updateCurrentVisual();
        this.saveToLocalStorage();
      }
    });

    this.bindSettingEvents();
  },

  bindSettingEvents() {
    // 24시간제 변경 스위치
    const timeToggle = document.querySelector("#timeFormatToggle");
    timeToggle?.addEventListener("change", (e) => {
      window.APP_CORE.state.is24h = e.target.checked;
      window.APP_CORE.renderTimeline();
      window.APP_CORE.updateCurrentVisual();
      this.saveToLocalStorage();
    });

    // 상단 런타임 타이틀 입력 제한 및 매핑
    const titleInput = document.querySelector("#titleTextChange");
    titleInput?.addEventListener("input", (e) => {
      let value = e.target.value;
      let totalScore = 0;
      let limitIndex = 0;

      for (let i = 0; i < value.length; i++) {
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(value[i]);
        totalScore += isKorean ? 2 : 1.1;
        if (totalScore <= 16) {
          limitIndex = i + 1;
        } else {
          break;
        }
      }

      if (totalScore > 16) {
        value = value.substring(0, limitIndex);
        e.target.value = value;
      }

      window.APP_CORE.state.title = value;
      const targetTitle = document.querySelector(".title--text p");
      if (targetTitle) targetTitle.textContent = value || "💚💜";
    });

    // 유저 프로필 업로드 및 배경 레이아웃 동기화
    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const profileBox = e.target.closest(".users--profile");
        if (!profileBox) return;
        
        // 순서(index) 혹은 ID를 기반으로 유저 타겟 분기
        const isUser1 = e.target.id === "profile-user1";
        const user = isUser1 ? "user1" : "user2";
        const file = e.target.files[0];
        
        if (file) {
          const url = URL.createObjectURL(file);
          const label = profileBox.querySelector(".users--profile__img");
          if (label) {
            label.style.backgroundImage = `url(${url})`;
            label.style.backgroundSize = "cover";
            label.style.backgroundPosition = "center";
            label.textContent = "";
          }
          const img = document.querySelector(`#${user} .Videos--users__profile img`);
          if (img) img.src = url;
        }
      });
    });

    // 유저 닉네임 변경 동기화
    document.querySelectorAll(".users--profile__nickname").forEach((input) => {
      input.addEventListener("input", (e) => {
        const profileBox = e.target.closest(".users--profile");
        const isUser1 = profileBox?.querySelector(".profile-input")?.id === "profile-user1";
        const user = isUser1 ? "user1" : "user2";
        
        const target = document.querySelector(`#${user} .nickname`);
        if (target) target.textContent = e.target.value || user;
      });
    });

    // 수동 세이브 버튼
    const saveBtn = document.querySelector("#saveDataBtn");
    saveBtn?.addEventListener("click", () => {
      this.saveToLocalStorage();
      const originalHTML = saveBtn.innerHTML;
      saveBtn.classList.add("success");
      saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>저장 완료!</span>`;
      setTimeout(() => {
        saveBtn.classList.remove("success");
        saveBtn.innerHTML = originalHTML;
      }, 1000);
    });

    // 전체 리셋 버튼
    const clearBtn = document.querySelector("#clearAllBtn");
    clearBtn?.addEventListener("click", async () => {
      if (confirm("모든 텍스트와 설정이 초기화됩니다. 정말 삭제하시겠습니까?")) {
        window.APP_CORE.clearAllData();
        localStorage.removeItem("APP_SAVE_DATA");
        
        // 프로필 뷰 초기화
        document.querySelectorAll(".users--profile__img").forEach(lbl => {
          lbl.style.backgroundImage = "";
          lbl.innerHTML = "+ <br> 프로필";
        });
        document.querySelectorAll(".users--profile__nickname").forEach(inp => inp.value = "");
        await VideoDB.clear();
        alert("모든 데이터가 삭제되었습니다.");
      }
    });
  },

  /* =========================
     VIEWPORT COMPONENT UPDATES
  ========================= */

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
    this.sortBtn.className = `btn btn-drawer ${isLocked ? "is-locked" : "is-unlocked"}`;
    this.sortBtn.innerHTML = isLocked
      ? `<i class="fa-solid fa-lock"></i> <span>잠금됨</span>`
      : `<i class="fa-solid fa-lock-open"></i> <span>이동 가능</span>`;

    document.body.classList.toggle("sort-unlocked", !isLocked);
  },

  updatePlayBtnUI() {
    if (!this.playBtn) return;
    if (window.isPlaying) {
      this.playBtn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>일시정지</span>`;
    } else {
      this.playBtn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${window.innerWidth <= 768 ? "재생" : "전체 재생"}</span>`;
    }
  },

  initDots(playableIndexes) {
    const container = document.querySelector(".Menu--dots");
    if (!container) return;
    container.innerHTML = "";
    const count = Math.min(playableIndexes.length, 9);
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      container.appendChild(dot);
    }
  },

  updateDots(currentIndex, playableIndexes) {
    const container = document.querySelector(".Menu--dots");
    if (!container || !playableIndexes) return;

    const dots = container.querySelectorAll("span");
    const activePos = playableIndexes.indexOf(currentIndex);
    const total = playableIndexes.length;

    let visualIdx = 0;
    if (total <= 9) {
      visualIdx = activePos !== -1 ? activePos : 0;
    } else {
      if (activePos < 5) {
        visualIdx = activePos !== -1 ? activePos : 0;
      } else if (activePos >= total - 4) {
        visualIdx = 9 - (total - activePos);
      } else {
        visualIdx = 4;
      }
    }

    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === visualIdx);
      dot.classList.toggle("prev", idx < visualIdx);
    });
  },

  saveToLocalStorage() {
    try {
      const data = window.APP_CORE.getStorageData();
      localStorage.setItem("APP_SAVE_DATA", JSON.stringify(data));
    } catch (e) {
      console.error("데이터 백업 실패", e);
    }
  },

  async loadFromLocalStorage() {
    const saved = localStorage.getItem("APP_SAVE_DATA");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      window.APP_CORE.applyStorageData(data);

      // [IndexedDB 연동] 저장되어 있는 실제 비디오 파일(Blob)을 안전하게 복원
      for (const slot of window.APP_CORE.state.slots) {
        const file1 = await VideoDB.load(slot.id, "user1");
        if (file1) slot.user1.videoURL = URL.createObjectURL(file1);

        const file2 = await VideoDB.load(slot.id, "user2");
        if (file2) slot.user2.videoURL = URL.createObjectURL(file2);
      }

      // 비디오 주소 복원이 끝난 후 타임라인 인터페이스 빌드
      window.APP_CORE.renderAll();

      const titleInput = document.querySelector("#titleTextChange");
      if (titleInput && data.title) {
        titleInput.value = data.title;
        const titleDisplay = document.querySelector(".title--text p");
        if (titleDisplay) titleDisplay.textContent = data.title;
      }

      const timeToggle = document.querySelector("#timeFormatToggle");
      if (timeToggle) timeToggle.checked = data.is24h;
    } catch (e) {
      console.error("데이터 롤백 오류", e);
    }
  },

  performVideoExchange(newVideo, backElement) {
    const oldVideos = Array.from(backElement.querySelectorAll("video.active"));
    newVideo.style.visibility = "visible";

    const playPromise = newVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    const activateNewVideo = () => {
      newVideo.classList.add("active");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          oldVideos.forEach((v) => {
            if (v !== newVideo) {
              v.classList.remove("active");
              v.pause();
              v.src = "";
              v.remove();
            }
          });
        });
      });
    };

    if ("requestVideoFrameCallback" in newVideo) {
      newVideo.requestVideoFrameCallback(() => { activateNewVideo(); });
    } else {
      setTimeout(activateNewVideo, 220);
    }
  },

  getFormattedTime(rawTime) {
    if (window.APP_CORE.state.is24h) return rawTime;

    let [hour, min] = rawTime.split(":").map(Number);
    let displayHour = hour % 12;
    displayHour = displayHour === 0 ? 12 : displayHour;
    const formattedMin = String(min).padStart(2, "0");

    return `${displayHour}:${formattedMin}`;
  },
};

window.APP_UI = APP_UI;
document.addEventListener("DOMContentLoaded", () => APP_UI.init());