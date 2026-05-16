/* =========================
   SETLOG MAKER MVP3
   script2.js
========================= */

const APP_CORE = {
  TIMES: [
    "04:00", "05:00", "06:00", "07:00", "08:00", "09:00",
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
    "22:00", "23:00", "00:00", "01:00", "02:00", "03:00",
  ],

  state: {
    slots: [],
    is24h: true,
    title: "💚💜",
  },

  currentIndex: 0,
  EMPTY_VIDEO: "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wStandardData...", 

  init() {
    window.isPlaying = false;
    this.createSlots();
    this.renderAll();
  },

  createEmptyUserData() {
    return {
      text: "",
      video: null,
      videoURL: "",
    };
  },

  createSlots() {
    this.state.slots = this.TIMES.map((time) => ({
      id: crypto.randomUUID(),
      time,
      user1: this.createEmptyUserData(),
      user2: this.createEmptyUserData(),
    }));
  },

  renderAll() {
    this.renderTimeline();
    if (window.APP_UI && typeof window.APP_UI.initDots === "function") {
      window.APP_UI.initDots(this.getPlayableIndexes());
    } else {
      this.renderDots();
    }
    this.syncVisual(this.currentIndex);
  },

  /* =========================
     TIMELINE RENDER
  ========================= */

  renderTimeline() {
    const timeline = document.querySelector(".timeline");
    if (!timeline) return;

    timeline.innerHTML = "";

    this.state.slots.forEach((slot, index) => {
      const item = document.createElement("div");
      item.className = "timeline--item Timeline--item";
      item.dataset.index = index;
      item.dataset.id = slot.id;

      const displayTime = window.APP_UI
        ? window.APP_UI.getFormattedTime(slot.time)
        : slot.time;

      item.innerHTML = `
        <div class="timeline--header">
          <span class="time-label">${displayTime}</span>
        </div>
        
        <div id="timeline-user1" class="timeline--wrap SettingUser" data-user="user1" data-index="${index}">
          ${this.renderUserWrap("user1", slot, index)}
        </div>
        
        <div id="timeline-user2" class="timeline--wrap SettingUser" data-user="user2" data-index="${index}">
          ${this.renderUserWrap("user2", slot, index)}
        </div>
      `;
      timeline.appendChild(item);
    });
  },

  renderUserWrap(user, slot, index) {
    const data = slot[user];
    return `
      <div class="thumb ${!data.videoURL ? "empty" : ""}" data-id="${slot.id}">
        ${
          data.videoURL
            ? `
          <video src="${data.videoURL}" muted playsinline></video>
          <button class="btn btn--delete_video delete-video-btn" data-user="${user}" data-id="${slot.id}" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        `
            : ""
        }
        <label class="btn btn--upload">
          <input type="file" data-user="${user}" data-index="${index}" accept="video/*" hidden />
          + add
        </label>
      </div>
      <input type="text" class="slot-text" data-user="${user}" data-index="${index}" value="${data.text}" placeholder="텍스트" />
    `;
  },

  /* =========================
     DOTS FALLBACK
  ========================= */

  renderDots() {
    const dotsWrap = document.querySelector(".Menu--dots");
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    this.state.slots.forEach(() => {
      const dot = document.createElement("span");
      dotsWrap.appendChild(dot);
    });
  },

  updateDots(index) {
    if (window.APP_UI && window.APP_UI.updateDots) {
      window.APP_UI.updateDots(index, this.getPlayableIndexes());
      return;
    }
    const dots = document.querySelectorAll(".Menu--dots span");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  },

  /* =========================
     VIDEO CREATION
  ========================= */
  
  createVideo(url) {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.autoplay = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;

      if (duration > 0 && duration < 2) {
        video.playbackRate = Math.max(0.1, duration / 2);
      } else if (duration >= 2) {
        video.playbackRate = 1.0;
        const stopVideo = () => {
          if (video.currentTime >= 2) {
            video.pause();
            video.removeEventListener("timeupdate", stopVideo);
          }
        };
        video.addEventListener("timeupdate", stopVideo);
      }
    });
    return video;
  },

  /* =========================
     VISUAL SYNC
  ========================= */

  syncVisual(index = 0) {
    this.currentIndex = index;
    const slot = this.state.slots[index];
    if (!slot) return;

    this.syncUserVisual("user1", slot);
    this.syncUserVisual("user2", slot);
    this.updateDots(index);
  },

  syncUserVisual(user, slot) {
    const data = slot[user];
    const visual = document.querySelector(`#${user}`);
    if (!visual) return;

    const back = visual.querySelector(".Videos--users__back");
    const timeEl = visual.querySelector(".Videos--users__middle h3");
    const textEl = visual.querySelector(".Videos--users__middle p");

    if (!back || !timeEl || !textEl) return;

    if (
      window.APP_UI &&
      typeof window.APP_UI.performVideoExchange === "function" &&
      data.videoURL
    ) {
      const nextVideo = this.createVideo(data.videoURL);
      back.appendChild(nextVideo);
      window.APP_UI.performVideoExchange(nextVideo, back);
    } else {
      back.innerHTML = "";
      if (data.videoURL) {
        const video = this.createVideo(data.videoURL);
        back.appendChild(video);
        video.play().catch(() => {});
      }
    }

    timeEl.textContent = window.APP_UI
      ? window.APP_UI.getFormattedTime(slot.time)
      : slot.time;
    textEl.textContent = data.text || "💤";
  },

  updateCurrentVisual() {
    this.syncVisual(this.currentIndex);
  },

  /* =========================
     DATA INTERFACE
  ========================= */

  getPlayableIndexes() {
    const indexes = [];
    this.state.slots.forEach((slot, idx) => {
      if (
        slot.user1.videoURL ||
        slot.user1.text.trim() ||
        slot.user2.videoURL ||
        slot.user2.text.trim()
      ) {
        indexes.push(idx);
      }
    });
    return indexes.length > 0 ? indexes : [0];
  },

  getStorageData() {
    const serializedSlots = this.state.slots.map((slot) => ({
      id: slot.id,
      time: slot.time,
      user1: { text: slot.user1.text, videoURL: slot.user1.videoURL },
      user2: { text: slot.user2.text, videoURL: slot.user2.videoURL },
    }));
    return {
      slots: serializedSlots,
      is24h: this.state.is24h,
      title: this.state.title,
    };
  },

  applyStorageData(data) {
    if (!data || !data.slots) return;
    this.state.is24h = data.is24h ?? true;
    this.state.title = data.title ?? "💚💜";

    this.state.slots = data.slots.map((savedSlot) => {
      return {
        id: savedSlot.id || crypto.randomUUID(),
        time: savedSlot.time,
        user1: {
          text: savedSlot.user1.text,
          video: null,
          videoURL: savedSlot.user1.videoURL,
        },
        user2: {
          text: savedSlot.user2.text,
          video: null,
          videoURL: savedSlot.user2.videoURL,
        },
      };
    });
  },

  clearAllData() {
    this.state.slots.forEach((slot) => {
      if (slot.user1.videoURL) URL.revokeObjectURL(slot.user1.videoURL);
      if (slot.user2.videoURL) URL.revokeObjectURL(slot.user2.videoURL);
    });
    this.currentIndex = 0;
    this.state.title = "💚💜";
    this.createSlots();
    this.renderAll();
  },

  /* =========================
     PLAYBACK SYSTEM
  ========================= */

  async startPlayback() {
    if (window.isPlaying) return;
    window.isPlaying = true;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();

    const playableIndexes = this.getPlayableIndexes();
    const startTime = performance.now();
    let isCompleted = true; 

    for (let i = 0; i < playableIndexes.length; i++) {
      if (!window.isPlaying) {
        isCompleted = false; 
        break;
      }

      const targetIndex = playableIndexes[i];
      this.syncVisual(targetIndex);

      const nextTime = startTime + (i + 1) * 2000;
      const delay = nextTime - performance.now();
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    this.stopPlayback(isCompleted);
  },

  stopPlayback(isCompleted = false) {
    window.isPlaying = false;

    if (window.APP_UI) {
      window.APP_UI.updatePlayBtnUI();
      document.body.classList.remove("is-playing");
    }

    if (isCompleted) {
      document
        .querySelectorAll(".Videos--users__back video:not(.active)")
        .forEach((v) => {
          v.pause();
          v.src = "";
          v.remove();
        });
      return;
    }

    document.querySelectorAll(".Videos--users__back video").forEach((v) => {
      v.pause();
      try {
        v.currentTime = 0;
      } catch (e) {}
      v.remove();
    });

    this.updateCurrentVisual();
  },
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());

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
}; // <-- 쉼표(,)에서 세미콜론(;)으로 수정하여 구문 오류 해결

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

    // ❌ (수정완료) async 키워드 추가하여 await Syntax Error 해결
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
    const timeToggle = document.querySelector("#timeFormatToggle");
    timeToggle?.addEventListener("change", (e) => {
      window.APP_CORE.state.is24h = e.target.checked;
      window.APP_CORE.renderTimeline();
      window.APP_CORE.updateCurrentVisual();
      this.saveToLocalStorage();
    });

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

    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const profileBox = e.target.closest(".users--profile");
        if (!profileBox) return;
        
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

    document.querySelectorAll(".users--profile__nickname").forEach((input) => {
      input.addEventListener("input", (e) => {
        const profileBox = e.target.closest(".users--profile");
        const isUser1 = profileBox?.querySelector(".profile-input")?.id === "profile-user1";
        const user = isUser1 ? "user1" : "user2";
        
        const target = document.querySelector(`#${user} .nickname`);
        if (target) target.textContent = e.target.value || user;
      });
    });

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

    const clearBtn = document.querySelector("#clearAllBtn");
    // ❌ (수정완료) async 키워드 추가하여 await Syntax Error 해결
    clearBtn?.addEventListener("click", async () => {
      if (confirm("모든 텍스트와 설정이 초기화됩니다. 정말 삭제하시겠습니까?")) {
        window.APP_CORE.clearAllData();
        localStorage.removeItem("APP_SAVE_DATA");
        
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

      for (const slot of window.APP_CORE.state.slots) {
        const file1 = await VideoDB.load(slot.id, "user1");
        // 메모리 누수 방지: 기존 URL 해제 후 새 Blob 할당
        if (file1) {
          if (slot.user1.videoURL) URL.revokeObjectURL(slot.user1.videoURL);
          slot.user1.videoURL = URL.createObjectURL(file1);
        }

        const file2 = await VideoDB.load(slot.id, "user2");
        if (file2) {
          if (slot.user2.videoURL) URL.revokeObjectURL(slot.user2.videoURL);
          slot.user2.videoURL = URL.createObjectURL(file2);
        }
      }

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