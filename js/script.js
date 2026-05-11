const APP_CORE = {
  // 기준 시간은 유지 (내부 계산용)
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
    user1: [],
    user2: [],
    is24h: false, // 시간제 상태 추가
  },

  init() {
    window.isPlaying = false;
    window.isSortLocked = window.innerWidth <= 768;
    this.initData("user1");
    this.initData("user2");
    this.renderAll();
  },

  // 인덱스에 따른 시간 텍스트 생성 로직
  getTimeLabel(index) {
    const rawTime = this.TIMES[index];
    if (this.state.is24h) return rawTime;

    // 12시간제 변환 (04:00 포맷 기준)
    let [hour, min] = rawTime.split(":").map(Number);
    let displayHour = hour % 12;
    displayHour = displayHour === 0 ? 12 : displayHour;

    const formattedHour = String(displayHour).padStart(2, "0");
    const formattedMin = String(min).padStart(2, "0");

    return `${formattedHour}:${formattedMin}`;
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

  syncVisual(user, index) {
    const slot = this.state[user][index];
    const view = document.querySelector(`#${user}`);
    if (!view || !slot) return;

    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    back.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.src = "";
      v.remove();
    });
    timeEl.textContent = this.getTimeLabel(index); // 시간 레이블 업데이트
    textEl.textContent = slot.text || (slot.videoURL ? "" : "💤");

    if (slot.videoURL) {
      const video = document.createElement("video");
      video.src = slot.videoURL;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      Object.assign(video.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: "0.9",
        zIndex: "10",
      });
      back.appendChild(video);
    }
  },

  // 모든 렌더링 갱신 (시간제 변경 시 사용)
  renderAll() {
    this.renderTimeline("user1");
    this.renderTimeline("user2");
    this.syncVisual("user1", 0);
    this.syncVisual("user2", 0);
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
      const nextIndex = playable[i + 1]; // 다음 재생할 인덱스 확인

      // 1. 현재 영상 동기화 및 재생
      this.syncVisual("user1", currentIndex);
      this.syncVisual("user2", currentIndex);
      if (window.APP_UI) window.APP_UI.updateDots(currentIndex);

      // 2. [핵심] 다음 영상 미리 로드 (Preload)
      if (nextIndex !== undefined) {
        this.preloadNextVideo("user1", nextIndex);
        this.preloadNextVideo("user2", nextIndex);
      }

      // 2초간 대기 (기존 로직 유지)
      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    this.stopPlayback();
  },

  preloadNextVideo(user, index) {
    const slot = this.state[user][index];
    if (!slot || !slot.videoURL) return;

    // 이미 생성된 프리로드 태그가 있는지 확인
    const view = document.querySelector(`#${user}`);
    const back = view.querySelector(".Videos--users__back");

    // 중복 생성 방지용 체크
    if (back.querySelector(`video[data-preload="${index}"]`)) return;

    const nextVideo = document.createElement("video");
    nextVideo.src = slot.videoURL;
    nextVideo.preload = "auto";
    nextVideo.muted = true;
    nextVideo.playsInline = true;
    nextVideo.dataset.preload = index; // 식별자 부여

    // 화면 밖이나 투명하게 숨김 처리
    Object.assign(nextVideo.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      opacity: "0.01",
      zIndex: "-1",
    });

    back.appendChild(nextVideo);

    // 메모리 관리를 위해 현재 재생이 끝나면 삭제하기 쉽도록 설정
  },

  syncVisual(user, index) {
    const slot = this.state[user][index];
    const view = document.querySelector(`#${user}`);
    if (!view || !slot) return;

    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    // 기존 비디오 제거 (프리로드된 비디오가 있다면 그것을 재사용하거나 새로 생성)
    const preloaded = back.querySelector(`video[data-preload="${index}"]`);

    back.querySelectorAll("video").forEach((v) => {
      if (v !== preloaded) {
        v.pause();
        v.src = "";
        v.remove();
      }
    });

    timeEl.textContent = this.getTimeLabel(index);
    textEl.textContent = slot.text || (slot.videoURL ? "" : "💤");

    if (preloaded) {
      // 미리 로드된 영상이 있으면 스타일만 변경해서 바로 표시
      Object.assign(preloaded.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: "0.9",
        zIndex: "10",
      });
      preloaded.autoplay = true;
      preloaded.loop = true;
      preloaded.play();
      delete preloaded.dataset.preload; // 프리로드 태그 제거
    } else if (slot.videoURL) {
      // 미리 로드된 게 없으면 새로 생성
      const video = document.createElement("video");
      video.src = slot.videoURL;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      Object.assign(video.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: "0.9",
        zIndex: "10",
      });
      back.appendChild(video);
    }
  },

  stopPlayback() {
    window.isPlaying = false;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();
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

  renderAll() {
    this.renderTimeline("user1");
    this.renderTimeline("user2");
    this.syncVisual("user1", 0);
    this.syncVisual("user2", 0);
  },
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());