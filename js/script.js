/* =========================
   CORE SCRIPT (script.js)
========================= */

const APP_CORE = {
  TIMES: [
    "4:00",
    "5:00",
    "6:00",
    "7:00",
    "8:00",
    "9:00",
    "10:00",
    "11:00",
    "12:00",
    "1:00",
    "2:00",
    "3:00",
  ],
  state: { user1: [], user2: [] },

  init() {
    console.log("CORE INIT OK");
    window.isPlaying = false;
    window.isSortLocked = window.innerWidth <= 768;

    this.initData("user1");
    this.initData("user2");
    this.renderAll();
    this.bindEvents();
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

    container.innerHTML = this.state[user]
      .map(
        (slot, i) => `
      <div class="Timeline--item" data-id="${slot.id}">
        <div class="Timeline--header">
          <span class="time-label">${this.TIMES[i]}</span>
        </div>
        ${
          slot.videoURL
            ? `
            <div class="thumb">
              <video src="${slot.videoURL}" muted playsinline></video>
              <button class="delete-video-btn" data-user="${user}" data-id="${slot.id}">
                <i class="fa-solid fa-trash"></i>
              </button>
            `
            : `
            <div class="thumb empty">
              <video src="${slot.videoURL}" muted playsinline></video>
            `
        }
        </div>
        <textarea class="slot-text" data-index="${i}" placeholder="텍스트">${slot.text}</textarea>
      </div>
    `,
      )
      .join("");

    this.initSortable(user, container);
  },

  initSortable(user, el) {
    if (el._sortable) el._sortable.destroy();
    el._sortable = new Sortable(el, {
      animation: 200,
      easing: "cubic-bezier(0.2, 1, 0.3, 1)",
      disabled: window.isSortLocked,
      ghostClass: "sortable-ghost",
      dragClass: "sortable-drag",
      forceFallback: true,
      fallbackOnBody: true,
      //handle: ".drag-handle",

      onStart: () => {
        document.body.classList.add("is-sorting");
      },

      onEnd: (evt) => {
        const allItems = Array.from(el.querySelectorAll(".Timeline--item"));
        const newOrderIds = allItems.map((item) => item.dataset.id);

        this.state[user].sort((a, b) => {
          return newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id);
        });

        allItems.forEach((item, i) => {
          const thumbSpan = item.querySelector(".thumb span");
          if (thumbSpan) thumbSpan.textContent = this.TIMES[i];
          const textarea = item.querySelector(".slot-text");
          if (textarea) textarea.dataset.index = i;
        });

        this.syncVisual(user, 0);
        document.body.classList.remove("is-sorting");
      },
    });
  },

  stopPlayback() {
    window.isPlaying = false;
    this.updatePlayBtnUI();
  },

  preloadNext(user, nextIndex) {
    const nextSlot = this.state[user][nextIndex];
    if (!nextSlot || !nextSlot.videoURL) return;

    const back = document.querySelector(`#${user} .Videos--users__back`);
    const isAlreadyLoaded = Array.from(back.querySelectorAll("video")).some(
      (v) => v.src === nextSlot.videoURL,
    );

    if (!isAlreadyLoaded) {
      const preVideo = document.createElement("video");
      preVideo.src = nextSlot.videoURL;
      preVideo.preload = "auto";
      preVideo.muted = true;
      preVideo.style.display = "none"; // 백그라운드에서 로드
      back.appendChild(preVideo);
    }
  },

  async startPlayback() {
    if (window.isPlaying) return;

    const playableIndexes = this.getPlayableIndexes();

    // 재생할 게 없으면 종료
    if (!playableIndexes.length) {
      alert("재생할 콘텐츠가 없습니다.");
      return;
    }

    window.isPlaying = true;
    this.updatePlayBtnUI();

    for (let step = 0; step < playableIndexes.length; step++) {
      if (!window.isPlaying) break;

      const i = playableIndexes[step];

      requestAnimationFrame(() => {
        this.syncVisual("user1", i);
        this.syncVisual("user2", i);
        this.updateDots(i);
      });

      // 다음 재생 예정 index
      const nextPlayable =
        playableIndexes[(step + 1) % playableIndexes.length];

      this.preloadNext("user1", nextPlayable);
      this.preloadNext("user2", nextPlayable);

      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    this.stopPlayback();
  },

  syncVisual(user, index) {
    const slot = this.state[user][index];
    const view = document.querySelector(`#${user}`);
    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    // 1. 이전 영상 '즉시' 파괴 (좀비 방지)
    const oldVideos = back.querySelectorAll("video");
    oldVideos.forEach((v) => {
      if (v.style.display !== "none") {
        // 프리로드 중인 영상은 유지
        v.pause();
        v.src = "";
        v.remove();
      }
    });

    // 2. 텍스트 및 시간 즉시 업데이트
    timeEl.textContent = this.TIMES[index];
    back.style.backgroundColor = "#000";
    textEl.textContent = slot.text || (!slot.videoURL ? "💤" : "");

    // 3. 영상 노출
    if (slot.videoURL) {
      let nextVideo = Array.from(back.querySelectorAll("video")).find(
        (v) => v.src === slot.videoURL,
      );

      if (nextVideo) {
        // 프리로드 된 영상이 있으면 즉시 노출
        Object.assign(nextVideo.style, {
          display: "block",
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: "0.9", // 오퍼시티 0.9 고정
          zIndex: "10",
        });
        nextVideo.play().catch(() => {});
      } else {
        // 없으면 새로 생성
        const newVideo = document.createElement("video");
        newVideo.src = slot.videoURL;
        newVideo.muted = true;
        newVideo.autoplay = true;
        newVideo.loop = true;
        newVideo.playsInline = true;
        Object.assign(newVideo.style, {
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: "0.9",
          zIndex: "10",
        });
        back.appendChild(newVideo);
      }
    }
  },

  updatePlayBtnUI() {
    const btn = document.querySelector("#playAll");
    if (!btn) return;
    const isMobile = window.innerWidth <= 768;

    if (window.isPlaying) {
      btn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>일시정지</span>`;
    } else {
      const text = isMobile ? "재생" : "전체 재생";
      btn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${text}</span>`;
    }
  },

  updateDots(index) {
    document.querySelectorAll(".Menu--dots span").forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  },

  hasContent(slot) {
    return !!(slot.videoURL || (slot.text && slot.text.trim() !== ""));
  },

  getPlayableIndexes() {
    const result = [];

    for (let i = 0; i < this.TIMES.length; i++) {
      const user1Slot = this.state.user1[i];
      const user2Slot = this.state.user2[i];

      const hasUser1 = this.hasContent(user1Slot);
      const hasUser2 = this.hasContent(user2Slot);

      // 둘 중 하나라도 콘텐츠 있으면 재생
      if (hasUser1 || hasUser2) {
        result.push(i);
      }
    }

    return result;
  },

  bindEvents() {
    document.querySelector("#toggleSort")?.addEventListener("click", (e) => {
      e.stopPropagation();

      window.isSortLocked = !window.isSortLocked;

      if (window.APP_UI) {
        window.APP_UI.updateSortUI();
        window.APP_UI.updateDraggableUI();
      }

      ["user1", "user2"].forEach((u) => {
        const el = document.querySelector(`#timeline-${u}`);

        if (el?._sortable) {
          el._sortable.option("disabled", window.isSortLocked);
        }
      });
    });

    document.querySelectorAll(".SettingUser").forEach((setting) => {
      const user = setting.dataset.user;
      setting.querySelector(".video-input")?.addEventListener("change", (e) => {
        const files = [...e.target.files].slice(0, 12);
        files.forEach((file, i) => {
          if (this.state[user][i]) {
            if (this.state[user][i].videoURL)
              URL.revokeObjectURL(this.state[user][i].videoURL);
            this.state[user][i].videoURL = URL.createObjectURL(file);
          }
        });
        this.renderTimeline(user);
        this.syncVisual(user, 0);
      });
    });

    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("slot-text")) {
        const user = e.target.closest(".SettingUser").dataset.user;
        const itemId = e.target.closest(".Timeline--item").dataset.id;
        const targetItem = this.state[user].find((item) => item.id === itemId);
        if (targetItem) {
          targetItem.text = e.target.value;
          const currentIndex = this.state[user].indexOf(targetItem);
          this.syncVisual(user, currentIndex);
        }
      }
    });

    document.querySelectorAll(".nickname-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const nickname = e.target.value;
        const visualNickname = document.querySelector(`#${user} .nickname`);
        if (visualNickname) visualNickname.textContent = nickname || user;
      });
    });

    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const file = e.target.files[0];
        if (file) {
          const imageURL = URL.createObjectURL(file);
          const uploadLabel = e.target
            .closest(".SettingUser--profile")
            .querySelector(".profile-upload");
          if (uploadLabel) {
            uploadLabel.style.backgroundImage = `url(${imageURL})`;
            uploadLabel.textContent = "";
          }
          const visualImg = document.querySelector(
            `#${user} .Videos--users__profile img`,
          );
          if (visualImg) visualImg.src = imageURL;
        }
      });
    });

    document.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".delete-video-btn");

      if (!deleteBtn) return;

      e.preventDefault();
      e.stopPropagation();

      const user = deleteBtn.dataset.user;
      const itemId = deleteBtn.dataset.id;

      const targetItem = this.state[user].find((item) => item.id === itemId);

      if (!targetItem) return;

      const ok = confirm("해당 영상을 삭제하시겠습니까?");

      if (!ok) return;

      if (targetItem.videoURL) {
        URL.revokeObjectURL(targetItem.videoURL);
      }

      targetItem.videoURL = "";

      this.renderTimeline(user);

      const currentIndex = this.state[user].findIndex(
        (item) => item.id === itemId,
      );

      this.syncVisual(user, Math.max(currentIndex, 0));
    });
  },

  renderAll() {
    this.renderTimeline("user1");
    this.renderTimeline("user2");
    this.syncVisual("user1", 0);
    this.syncVisual("user2", 0);
    this.updatePlayBtnUI();
    if (window.APP_UI) {
      window.APP_UI.updateSortUI();
      window.APP_UI.updateDraggableUI();
    }
  },
};

window.APP_CORE = APP_CORE;
document.addEventListener("DOMContentLoaded", () => APP_CORE.init());
