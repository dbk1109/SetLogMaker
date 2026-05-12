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
  state: { user1: [], user2: [], is24h: false },

  init() {
    window.isPlaying = false;
    window.isSortLocked = window.innerWidth <= 768;
    this.initData("user1");
    this.initData("user2");
    if (window.APP_UI) window.APP_UI.loadFromLocalStorage();
    this.renderAll();
  },

  // 데이터를 로컬 저장소용 객체로 변환
  getStorageData() {
    return {
      user1: this.state.user1.map((item) => ({
        text: item.text,
        videoURL: item.videoURL,
      })),
      user2: this.state.user2.map((item) => ({
        text: item.text,
        videoURL: item.videoURL,
      })),
      is24h: this.state.is24h,
      title: document.querySelector("#titleTextChange")?.value || "",
    };
  },

  // 저장된 데이터를 state에 주입
  applyStorageData(data) {
    if (!data) return;
    if (data.is24h !== undefined) this.state.is24h = data.is24h;

    // 텍스트와 영상 URL 복구
    ["user1", "user2"].forEach((user) => {
      if (data[user]) {
        data[user].forEach((savedItem, i) => {
          if (this.state[user][i]) {
            this.state[user][i].text = savedItem.text || "";
            this.state[user][i].videoURL = savedItem.videoURL || "";
          }
        });
      }
    });
  },

  // 저장 데이터 지우기
  clearAllData() {
    ["user1", "user2"].forEach((user) => {
      this.state[user].forEach((slot) => {
        if (slot.videoURL) URL.revokeObjectURL(slot.videoURL);
        slot.text = "";
        slot.videoURL = "";
      });
    });
    // 타이틀 초기화 (선택 사항)
    const titleInput = document.querySelector("#titleTextChange");
    const titleDisplay = document.querySelector(".title--text p");
    if (titleInput) titleInput.value = "";
    if (titleDisplay) titleDisplay.textContent = "💚💜";

    this.renderAll(); // 화면 갱신
  },

  getTimeLabel(index) {
    const rawTime = this.TIMES[index];
    if (this.state.is24h) return rawTime;

    // 12시간제 변환 (04:00 포맷 기준)
    let [hour, min] = rawTime.split(":").map(Number);
    let displayHour = hour % 12;
    displayHour = displayHour === 0 ? 12 : displayHour;

    //const formattedHour = String(displayHour).padStart(2, "0");
    const formattedMin = String(min).padStart(2, "0");

    return `${displayHour}:${formattedMin}`;
  },

  initData(user) {
    this.state[user] = this.TIMES.map(() => ({
      id: crypto.randomUUID(),
      text: "",
      videoURL: "",
    }));
  },

  renderTimeline(user) {
    const container = document.querySelector(`#timeline-${user}`);
    if (!container) return;

    container.innerHTML = this.state[user]
      .map(
        (slot, i) => `
      <div class="Timeline--item" data-id="${slot.id}">
        <div class="Timeline--header">
          <span class="time-label">${this.getTimeLabel(i)}</span> <!-- 메서드 호출로 변경 -->
        </div>
        <div class="thumb ${slot.videoURL ? "" : "empty"}">
          <video src="${slot.videoURL}" muted playsinline></video>
          ${
            slot.videoURL
              ? `
            <button class="delete-video-btn" data-user="${user}" data-id="${slot.id}">
              <i class="fa-solid fa-trash"></i>
            </button>`
              : ""
          }
        </div>
        <textarea class="slot-text" data-index="${i}" placeholder="텍스트">${slot.text}</textarea>
      </div>
    `,
      )
      .join("");

    this.initSortable(user, container);
    if (window.APP_UI) window.APP_UI.updateSortUI();

    const playable = this.getPlayableIndexes();
    if (window.APP_UI && typeof window.APP_UI.initDots === "function") {
      window.APP_UI.initDots(playable);
    }
  },

  initSortable(user, el) {
    if (el._sortable) el._sortable.destroy();
    el._sortable = new Sortable(el, {
      animation: 200,
      disabled: window.isSortLocked,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: () => {
        const allItems = Array.from(el.querySelectorAll(".Timeline--item"));
        const newOrderIds = allItems.map((item) => item.dataset.id);
        this.state[user].sort(
          (a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id),
        );

        allItems.forEach((item, i) => {
          const timeLabel = item.querySelector(".time-label");
          if (timeLabel) timeLabel.textContent = this.getTimeLabel(i); // 시간 레이블 업데이트
          const textarea = item.querySelector(".slot-text");
          if (textarea) textarea.dataset.index = i;
        });

        this.syncVisual(user, 0);
      },
    });
  },

  // 영상 미리 로드를 위한 메서드 (iOS 보정 버전)
  preloadNextVideo(user, index) {
    const slot = this.state[user][index];
    if (!slot || !slot.videoURL) return;

    const view = document.querySelector(`#${user}`);
    const back = view.querySelector(".Videos--users__back");

    if (back.querySelector(`video[data-preload="${index}"]`)) return;

    // UI 담당자에게 생성을 요청
    window.APP_UI.createPreloadVideo(user, index, slot.videoURL);
  },

  syncVisual(user, index) {
    const slot = this.state[user][index];
    const view = document.querySelector(`#${user}`);
    if (!view || !slot) return;

    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    const applyAll = (v) => {
      timeEl.textContent = this.getTimeLabel(index);
      textEl.textContent = slot.text || (slot.videoURL ? "" : "💤");

      if (v && window.APP_UI?.performVideoExchange) {
        window.APP_UI.performVideoExchange(v, back);
      } else if (v) {
        this.clearOldVideos(back, v);
        v.style.opacity = "0.9";
        v.play();
      } else {
        this.clearOldVideos(back);
      }
    };

    if (slot.videoURL) {
      let targetVideo = back.querySelector(`video[data-preload="${index}"]`);

      if (targetVideo && targetVideo.dataset.ready === "true") {
        applyAll(targetVideo);
      } else {
        if (!targetVideo) {
          window.APP_UI.createPreloadVideo(user, index, slot.videoURL);
          targetVideo = back.querySelector(`video[data-preload="${index}"]`);
        }

        targetVideo.onloadeddata = () => {
          targetVideo.dataset.ready = "true";
          applyAll(targetVideo);
        };

        setTimeout(() => {
          if (targetVideo.dataset.ready !== "true") applyAll(null);
        }, 100);
      }
    } else {
      applyAll(null);
    }
  },

  clearOldVideos(container, exceptVideo = null) {
    container.querySelectorAll("video").forEach((v) => {
      if (v === exceptVideo) return;
      v.style.opacity = "0";
      setTimeout(() => {
        v.pause();
        v.src = "";
        v.load();
        v.remove();
      }, 150);
    });
  },

  getPlayableIndexes() {
    const result = [];
    for (let i = 0; i < this.TIMES.length; i++) {
      if (
        this.state.user1[i].videoURL ||
        this.state.user1[i].text ||
        this.state.user2[i].videoURL ||
        this.state.user2[i].text
      ) {
        result.push(i);
      }
    }
    return result;
  },

  async startPlayback() {
    if (window.isPlaying) return;
    const playable = this.getPlayableIndexes();
    if (!playable.length) return alert("재생할 콘텐츠가 없습니다.");

    window.isPlaying = true;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();

    for (let i = 0; i < playable.length; i++) {
      if (!window.isPlaying) break;

      const currentIndex = playable[i];
      const nextIndex = playable[i + 1];
      const afterNextIndex = playable[i + 2];

      // 1. 현재 영상 교체 (이미 프리로드된 것을 사용)
      this.syncVisual("user1", currentIndex);
      this.syncVisual("user2", currentIndex);
      if (window.APP_UI) {
        window.APP_UI.updateDots(currentIndex, playable);
      }

      // 2. [Double Preload] 다음 것(i+1)과 그다음 것(i+2)을 동시에 준비
      if (nextIndex !== undefined) {
        this.preloadNextVideo("user1", nextIndex);
        this.preloadNextVideo("user2", nextIndex);
      }
      if (afterNextIndex !== undefined) {
        // 한 칸 더 앞의 영상을 미리 네트워크에서 땡겨옴
        this.preloadNextVideo("user1", afterNextIndex);
        this.preloadNextVideo("user2", afterNextIndex);
      }
      // 2초 대기 구간 (0.1초마다 isPlaying 상태를 체크하여 반응성 높임)
      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // 루프가 끝나거나 중단되면 호출
    this.stopPlayback();
  },

  stopPlayback() {
    window.isPlaying = false;

    // 1. 모든 재생 중인 비디오 일시정지
    document.querySelectorAll("video").forEach((v) => {
      v.pause();
    });

    // 2. UI 및 클래스 복구
    document.body.classList.remove("is-playing");
    document
      .querySelector("#fullscreenWrap")
      ?.classList.remove("ios-fullscreen");

    if (window.APP_UI) {
      window.APP_UI.updatePlayBtnUI();
    }
  },

  renderAll() {
    this.renderTimeline("user1");
    this.renderTimeline("user2");
    this.syncVisual("user1", 0);
    this.syncVisual("user2", 0);
  },
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());