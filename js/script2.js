/* ========================================================
   SETLOG MAKER MVP3 - Core System
   Filename: script2.js
   Description: 데이터 상태 관리, 타임라인 생성, 플레이백 엔진
======================================================== */

const APP_CORE = {
  TIMES: [ "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", ],

  state: {
    slots: [],
    is24h: false,
    title: "",
    profiles: { user1: "", user2: "" },
    nicknames: { user1: "", user2: "" },
  },

  currentIndex: 0,
  EMPTY_VIDEO: "./assets/black.mp4",
  syncTimer: null, // 실시간 타이머 저장소

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
    this.render24CircleIndicators();
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
          <p class="time-label">${displayTime}</p>
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
     DOTS FALLBACK & REALTIME SYNC
  ========================= */

  renderDots() {
    const playableIndexes = this.getPlayableIndexes();

    if (window.APP_UI && window.APP_UI.initDots) {
      window.APP_UI.initDots(playableIndexes);
      if (typeof this.state.currentSlotIndex !== "undefined") {
        this.updateDots(this.state.currentSlotIndex);
      }
      return;
    }

    const dotsWrap = document.querySelector(".Menu--dots");
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";

    if (playableIndexes.length <= 10) {
      dotsWrap.classList.add("justify-center");
    } else {
      dotsWrap.classList.remove("justify-center");
    }

    playableIndexes.forEach(() => {
      const dot = document.createElement("span");
      dotsWrap.appendChild(dot);
    });
  },

  updateDots(index) {
    if (window.APP_UI && window.APP_UI.updateDots) {
      window.APP_UI.updateDots(index, this.getPlayableIndexes());
      return;
    }
    const playableIndexes = this.getPlayableIndexes();
    const activePos = playableIndexes.indexOf(index);
    const dots = document.querySelectorAll(".Menu--dots span");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === activePos);
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

  syncUserVisual(user, slot) {
    const data = slot[user];
    const visual = document.querySelector(`#${user}`);
    if (!visual) return;

    const back = visual.querySelector(".Videos--users__back");
    const timeEl = visual.querySelector(".Videos--users__middle h3");
    const textEl = visual.querySelector(".Videos--users__middle p");

    if (!back || !timeEl || !textEl) return;

    // 표시할 시간과 텍스트 미리 계산
    const targetTime = window.APP_UI
      ? window.APP_UI.getFormattedTime(slot.time)
      : slot.time;

    const hasText = data.text && data.text.trim() !== "";
    const hasVideo = !!data.videoURL;
    let targetText = "";
    if (hasVideo && !hasText) targetText = "";
    else if (!hasVideo && !hasText) targetText = "💤";
    else targetText = data.text;

    // 비디오를 갈아끼울 때 시간과 텍스트 엘리먼트 정보, 바뀔 글자 같이 인자로
    if (
      window.APP_UI &&
      typeof window.APP_UI.performVideoExchange === "function" &&
      data.videoURL
    ) {
      const nextVideo = this.createVideo(data.videoURL);
      back.appendChild(nextVideo);

      // 배턴 터치 위임
      window.APP_UI.performVideoExchange(
        nextVideo,
        back,
        timeEl,
        targetTime,
        textEl,
        targetText,
      );
    } else {
      // 비디오가 없는 슬롯(텍스트만 있거나 💤 일 때)은 이전과 동일하게 즉시 변경
      back.innerHTML = "";
      timeEl.textContent = targetTime;
      textEl.textContent = targetText;

      if (data.videoURL) {
        const video = this.createVideo(data.videoURL);
        back.appendChild(video);
        video.play().catch(() => {});
      }
    }

    this.updateDots(this.currentIndex);
    this.render24CircleIndicators();
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
    this.render24CircleIndicators();
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
      profiles: this.state.profiles || { user1: "", user2: "" },
      nicknames: this.state.nicknames || { user1: "", user2: "" },
    };
  },

  applyStorageData(data) {
    if (!data || !data.slots) return;
    this.state.is24h = data.is24h ?? true;
    this.state.title = data.title ?? "💚💜";
    this.state.profiles = data.profiles || { user1: "", user2: "" };
    this.state.nicknames = data.nicknames || { user1: "", user2: "" };

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

  // 실시간 싱크 하이재킹 엔진 작동 함수
  startLiveSyncCheck() {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      const u1Video = document.querySelector("#user1 video.active");
      const u2Video = document.querySelector("#user2 video.active");

      if (u1Video && u2Video && !u1Video.paused && !u2Video.paused) {
        const diff = u1Video.currentTime - u2Video.currentTime; // 유저1 기준 오차
        const absDiff = Math.abs(diff);

        // [개선 1] 눈에 띄지 않는 미세한 차이(0.12초 이내)는 그냥 눈감아줍니다 (정속 재생)
        if (absDiff <= 0.12) {
          u2Video.playbackRate = 1.0;
          return;
        }

        // [개선 2] 오차가 0.12초 ~ 0.4초 사이일 때는 배속을 미세하게 조절해 부드럽게 따라잡기 (끊김 없음!)
        if (absDiff > 0.12 && absDiff <= 0.4) {
          if (diff > 0) {
            // 유저 2가 느린 상황 -> 유저 2의 속도를 1.15배속으로 올려서 부드럽게 추격
            u2Video.playbackRate = 1.15;
          } else {
            // 유저 2가 더 빠른 상황 -> 유저 2의 속도를 0.85배속으로 낮춰서 대기
            u2Video.playbackRate = 0.85;
          }
          console.log(
            `[Soft Sync] 미세 속도 조절 작동 중... 오차: ${(diff * 1000).toFixed(0)}ms`,
          );
        }
        // [개선 3] 오차가 0.4초 이상으로 너무 크게 벌어졌을 때만 어쩔 수 없이 텔레포트(강제 동기화)
        else if (absDiff > 0.4) {
          u2Video.currentTime = u1Video.currentTime;
          u2Video.playbackRate = 1.0;
          console.log(`[Hard Sync] 오차가 너무 커 강제 도킹 수행.`);
        }
      }
    }, 250); // 감시 주기도 0.25초로 늦춰 모바일 AP 과부하 방지
  },

  // 싱크 체크 중지 함수
  stopLiveSyncCheck() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  },

  async startPlayback() {
    if (window.isPlaying) return;

    const playableIndexes = this.getPlayableIndexes();
    const preloader = document.querySelector("#videoPreloader");
    const progressText = document.querySelector("#preloadProgress");

    if (progressText) progressText.textContent = "0";
    if (preloader) preloader.classList.add("active");

    let loadedCount = 0;
    const totalToLoad = playableIndexes.length * 2;

    const preloadVideo = (url) => {
      return new Promise((resolve) => {
        if (!url) {
          loadedCount++;
          if (progressText)
            progressText.textContent = Math.round(
              (loadedCount / totalToLoad) * 100,
            );
          return resolve();
        }
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.preload = "auto";
        v.playsinline = true;

        const onLoaded = () => {
          loadedCount++;
          if (progressText)
            progressText.textContent = Math.round(
              (loadedCount / totalToLoad) * 100,
            );
          v.removeEventListener("loadeddata", onLoaded);
          v.removeEventListener("error", onLoaded);
          resolve();
        };

        v.addEventListener("loadeddata", onLoaded);
        v.addEventListener("error", onLoaded);
        v.load();
      });
    };

    const loadPromises = [];
    playableIndexes.forEach((idx) => {
      const slot = this.state.slots[idx];
      loadPromises.push(preloadVideo(slot.user1.videoURL));
      loadPromises.push(
        slot.user2 ? preloadVideo(slot.user2.videoURL) : Promise.resolve(),
      );
    });

    await Promise.all(loadPromises);

    if (preloader) preloader.classList.remove("active");

    window.isPlaying = true;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();

    // 재생이 진짜 시작되는 시점에 실시간 동기화 감시 기동!
    this.startLiveSyncCheck();

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

    // 플레이백이 끝나거나 사용자가 멈추면 실시간 감시 레이더 즉시 해제
    this.stopLiveSyncCheck();

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

  render24CircleIndicators() {
    const indicatorContainer = document.querySelector(".timeTitle .indicator");
    if (!indicatorContainer) return;

    indicatorContainer.innerHTML = "";

    this.state.slots.forEach((slot, index) => {
      const dot = document.createElement("div");
      dot.className = "time-dot";
      dot.dataset.targetIndex = index;
      dot.innerText = (index + 4) % 24;

      if (index === this.currentIndex) {
        dot.classList.add("is-current");
      }

      const hasU1Content =
        slot.user1.videoURL ||
        (slot.user1.text && slot.user1.text.trim() !== "");
      const hasU2Content =
        slot.user2 &&
        (slot.user2.videoURL ||
          (slot.user2.text && slot.user2.text.trim() !== ""));

      if (hasU1Content || hasU2Content) {
        dot.classList.add("is-filled");
      }

      dot.addEventListener("click", () => {
        this.syncVisual(index);
        const targetElement = document.querySelector(
          `.timeline--item[data-index="${index}"]`,
        );
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });

      indicatorContainer.appendChild(dot);
    });
  },
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());