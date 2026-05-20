/* ========================================================
   SETLOG MAKER MVP3 - Core System
   Filename: script2.js
   Description: 데이터 상태 관리, 타임라인 생성, 플레이백 엔진
======================================================== */

const APP_CORE = {
  TIMES: [
    "04:00",
    "05:00",
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
    "00:00",
    "01:00",
    "02:00",
    "03:00",
  ],

  state: {
    slots: [],
    is24h: false,
    title: "",
    profiles: { user1: "", user2: "" },
    nicknames: { user1: "", user2: "" },
  },

  currentIndex: 0,
  EMPTY_VIDEO: "./assets/black.mp4",

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
    // 1. 실시간으로 현재 활성화된(플레이 가능한) 인덱스 배열을 가져옵니다.
    const playableIndexes = this.getPlayableIndexes();

    // 2. 컨트롤러(APP_UI)가 존재하면, 새로고침 없이 실시간 개수를 반영하도록 initDots를 다시 실행합니다.
    if (window.APP_UI && window.APP_UI.initDots) {
      window.APP_UI.initDots(playableIndexes);
      // 초기 렌더링 시 현재 활성화된 인덱스로 도트 위치도 업데이트
      if (typeof this.state.currentSlotIndex !== "undefined") {
        this.updateDots(this.state.currentSlotIndex);
      }
      return;
    }

    // 컨트롤러가 없는 환경에서의 Fallback 처리
    const dotsWrap = document.querySelector(".Menu--dots");
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";

    // 조건 2: 10개 이하일 때 중앙 정렬을 위한 클래스 분기
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
    // Fallback 업데이트 로직
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
    video.preload = "auto";
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
    this.render24CircleIndicators();
  },

  syncUserVisual(user, slot) {
    const data = slot[user];
    const visual = document.querySelector(`#${user}`);
    if (!visual) return;

    const back = visual.querySelector(".Videos--users__back");
    const timeEl = visual.querySelector(".Videos--users__middle h3");
    const textEl = visual.querySelector(".Videos--users__middle p");

    if (!back || !timeEl || !textEl) return;

    // 비디오 재생/교체 로직
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

    // 시간 출력
    timeEl.textContent = window.APP_UI
      ? window.APP_UI.getFormattedTime(slot.time)
      : slot.time;

    // 유저별 개별 텍스트 출력 분기 규칙
    const hasText = data.text && data.text.trim() !== "";
    const hasVideo = !!data.videoURL;

    if (hasVideo && !hasText) {
      textEl.textContent = "";
    } else if (!hasVideo && !hasText) {
      textEl.textContent = "💤";
    } else {
      textEl.textContent = data.text;
    }
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

  async startPlayback() {
    if (window.isPlaying) return;

    const playableIndexes = this.getPlayableIndexes();
    const preloader = document.querySelector("#videoPreloader");
    const progressText = document.querySelector("#preloadProgress");

    // [Step 1] 모바일 프리로드 연출 시작
    if (preloader) preloader.classList.add("active");
    if (progressText) progressText.textContent = "0";

    let loadedCount = 0;
    const totalToLoad = playableIndexes.length * 2; // user1, user2 한 쌍 기준

    // 플레이 리스트 전체 비디오 미리 웜업 로딩하는 헬퍼 프로미스
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

        // 첫 프레임 렌더링 준비 완료 지점 추적
        v.addEventListener("loadeddata", onLoaded);
        v.addEventListener("error", onLoaded);
        v.load(); // 강제 스트리밍 로드 명령
      });
    };

    // 모든 슬롯 비디오 동시 예열 로드 실행
    const loadPromises = [];
    playableIndexes.forEach((idx) => {
      const slot = this.state.slots[idx];
      loadPromises.push(preloadVideo(slot.user1.videoURL));
      loadPromises.push(
        slot.user2 ? preloadVideo(slot.user2.videoURL) : Promise.resolve(),
      );
    });

    // 네트워크 리소스 확보 완료까지 완벽 대기
    await Promise.all(loadPromises);

    // [Step 2] 로딩 UI 종료 및 본 재생 시작
    if (preloader) preloader.classList.remove("active");

    window.isPlaying = true;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();

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

  render24CircleIndicators() {
    const indicatorContainer = document.querySelector(".timeTitle .indicator");
    if (!indicatorContainer) return;

    indicatorContainer.innerHTML = "";

    this.state.slots.forEach((slot, index) => {
      const dot = document.createElement("div");
      dot.className = "time-dot";
      dot.dataset.targetIndex = index;
      dot.innerText = (index + 4) % 24;

      // 규칙 1: 현재 유저가 스크롤 보거나 선택하고 있는 현재 시간 블록 위치 가리키기
      if (index === this.currentIndex) {
        dot.classList.add("is-current");
      }

      // 규칙 2: 내용(user1 혹은 user2의 비디오 또는 텍스트 중 하나라도 존재할 때) 스위칭
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

      // 인디케이터의 개별 동그라미를 누르면 해당 타임라인 줄로 스크롤/이동
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