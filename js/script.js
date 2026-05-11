const APP_CORE = {
  TIMES: [
    "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "01:00", "02:00", "03:00",
    "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "01:00", "02:00", "03:00"
  ],
  state: { user1: [], user2: [] },

  init() {
    window.isPlaying = false;
    // 초기 잠금 상태 설정 (모바일은 기본 잠금)
    window.isSortLocked = window.innerWidth <= 768;
    this.initData("user1");
    this.initData("user2");
    this.renderAll();
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

    container.innerHTML = this.state[user].map((slot, i) => `
      <div class="Timeline--item" data-id="${slot.id}">
        <div class="Timeline--header">
          <span class="time-label">${this.TIMES[i]}</span>
        </div>
        <div class="thumb ${slot.videoURL ? "" : "empty"}">
          <video src="${slot.videoURL}" muted playsinline></video>
          ${slot.videoURL ? `
            <button class="delete-video-btn" data-user="${user}" data-id="${slot.id}">
              <i class="fa-solid fa-trash"></i>
            </button>` : ""}
        </div>
        <textarea class="slot-text" data-index="${i}" placeholder="텍스트">${slot.text}</textarea>
      </div>
    `).join("");

    this.initSortable(user, container);
    // 렌더링 후 UI 상태 동기화 (body 클래스 등)
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
        const newOrderIds = allItems.map(item => item.dataset.id);
        this.state[user].sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));

        allItems.forEach((item, i) => {
          const timeLabel = item.querySelector(".time-label");
          if (timeLabel) timeLabel.textContent = this.TIMES[i];
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

    back.querySelectorAll("video").forEach(v => { v.pause(); v.src = ""; v.remove(); });
    timeEl.textContent = this.TIMES[index];
    textEl.textContent = slot.text || (slot.videoURL ? "" : "💤");

    if (slot.videoURL) {
      const video = document.createElement("video");
      video.src = slot.videoURL;
      video.muted = true; video.autoplay = true; video.loop = true; video.playsInline = true;
      Object.assign(video.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", opacity: "0.9", zIndex: "10" });
      back.appendChild(video);
    }
  },

  async startPlayback() {
    if (window.isPlaying) return;
    const playable = this.getPlayableIndexes();
    if (!playable.length) return alert("재생할 콘텐츠가 없습니다.");

    window.isPlaying = true;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();

    for (let i of playable) {
      if (!window.isPlaying) break;
      this.syncVisual("user1", i);
      this.syncVisual("user2", i);
      if (window.APP_UI) window.APP_UI.updateDots(i);
      
      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    this.stopPlayback();
  },

  stopPlayback() {
    window.isPlaying = false;
    if (window.APP_UI) window.APP_UI.updatePlayBtnUI();
  },

  getPlayableIndexes() {
    const result = [];
    for (let i = 0; i < this.TIMES.length; i++) {
      if (this.state.user1[i].videoURL || this.state.user1[i].text || 
          this.state.user2[i].videoURL || this.state.user2[i].text) {
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
  }
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());