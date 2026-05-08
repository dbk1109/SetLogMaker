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
    // 초기 로드 시 너비에 따라 잠금 상태 결정
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
    if (!container) return;

    container.innerHTML = this.state[user]
      .map(
        (slot, i) => `
      <div class="Timeline--item" data-id="${slot.id}">
        <div class="thumb">
          ${slot.videoURL ? `<video src="${slot.videoURL}" muted playsinline></video>` : `<span>${this.TIMES[i]}</span>`}
        </div>
        <textarea class="slot-text" data-index="${i}">${slot.text}</textarea>
      </div>
    `,
      )
      .join("");

    this.initSortable(user, container);
  },

  initSortable(user, el) {
    if (el._sortable) el._sortable.destroy();
    el._sortable = new Sortable(el, {
      animation: 150,
      disabled: window.isSortLocked,
      onEnd: (evt) => {
        const items = this.state[user];
        const [movedItem] = items.splice(evt.oldIndex, 1);
        items.splice(evt.newIndex, 0, movedItem);
        this.renderTimeline(user);
        this.syncVisual(user, 0);
      },
    });
  },

  stopPlayback() {
    window.isPlaying = false;
    this.updatePlayBtnUI();
  },

  async startPlayback() {
    if (window.isPlaying) return;

    const isMobileFS = window.innerWidth <= 768 && !!document.fullscreenElement;
    if (isMobileFS)
      document.querySelector(".controller")?.classList.add("is-hidden");

    window.isPlaying = true;
    this.updatePlayBtnUI();

    for (let i = 0; i < this.TIMES.length; i++) {
      if (!window.isPlaying) break;

      this.syncVisual("user1", i);
      this.syncVisual("user2", i);
      this.updateDots(i);

      // --- 수정된 대기 로직 (2초를 100ms씩 20번 나눠서 체크) ---
      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break; // 중간에 일시정지 누르면 즉시 탈출
        await new Promise((r) => setTimeout(r, 100)); // 0.1초 대기
      }
      // --------------------------------------------------
    }

    this.stopPlayback();

    if (isMobileFS)
      document.querySelector(".controller")?.classList.remove("is-hidden");
  },

  async runPlaybackLoop() {
    for (let i = 0; i < this.TIMES.length; i++) {
      if (!window.isPlaying) break;

      this.syncVisual("user1", i);
      this.syncVisual("user2", i);
      this.updateDots(i);

      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    window.isPlaying = false;
    this.updatePlayBtnUI();
  },

  syncVisual(user, index) {
    const slot = this.state[user][index];
    const view = document.querySelector(`#${user}`);
    if (!view || !slot) return;

    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    timeEl.textContent = this.TIMES[index];
    textEl.textContent = slot.text || "💤";

    if (slot.videoURL) {
      back.innerHTML = `<video src="${slot.videoURL}" muted autoplay loop playsinline></video>`;
    } else {
      back.innerHTML = "";
      back.style.backgroundColor = "#000";
    }
  },

  updatePlayBtnUI() {
    const btn = document.querySelector("#playAll");
    if (!btn) return;

    const isMobile = window.innerWidth <= 768;

    // [수정] innerHTML 주입 시 <i> 태그와 <span> 태그가 누락되지 않도록 확인
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

  bindEvents() {
    // 정렬 잠금 토글
    document.querySelector("#toggleSort")?.addEventListener("click", (e) => {
      // [추가] 이벤트가 document까지 전달되어 서랍이 닫히는 것을 방지
      e.stopPropagation();

      window.isSortLocked = !window.isSortLocked;

      ["user1", "user2"].forEach((u) => {
        const el = document.querySelector(`#timeline-${u}`);
        if (el?._sortable) el._sortable.option("disabled", window.isSortLocked);
      });

      if (window.APP_UI) window.APP_UI.updateSortUI();
    });

    // 비디오 업로드 (이벤트 위임)
    document.querySelectorAll(".SettingUser").forEach((setting) => {
      const user = setting.dataset.user;
      setting.querySelector(".video-input")?.addEventListener("change", (e) => {
        const files = [...e.target.files].slice(0, 12);
        // script.js 내 업로드 핸들러 예시 (이전 리팩토링안 보강)
        files.forEach((file, i) => {
          if (this.state[user][i]) {
            // 12개 슬롯 범위를 넘지 않게
            if (this.state[user][i].videoURL)
              URL.revokeObjectURL(this.state[user][i].videoURL);
            this.state[user][i].videoURL = URL.createObjectURL(file);
          }
        });
        this.renderTimeline(user);
        this.syncVisual(user, 0);
      });
    });

    // 텍스트 입력 (이벤트 위임)
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("slot-text")) {
        const user = e.target.closest(".SettingUser").dataset.user;
        this.state[user][e.target.dataset.index].text = e.target.value;
        this.syncVisual(user, e.target.dataset.index);
      }
    });

    // [추가] 닉네임 입력 시 실시간 반영
    document.querySelectorAll(".nickname-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const nickname = e.target.value;
        
        // 1. 비주얼 영역 닉네임 텍스트 변경
        const visualNickname = document.querySelector(`#${user} .nickname`);
        if (visualNickname) {
          visualNickname.textContent = nickname || user; // 비어있으면 기본 이름
        }
      });
    });

    // [추가] 프로필 이미지 업로드 및 반영
    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const file = e.target.files[0];
        
        if (file) {
          const imageURL = URL.createObjectURL(file);
          
          // 1. 세팅 영역의 '+' 버튼 배경을 업로드한 이미지로 변경
          const uploadLabel = e.target.closest(".SettingUser--profile").querySelector(".profile-upload");
          if (uploadLabel) {
            uploadLabel.style.backgroundImage = `url(${imageURL})`;
            uploadLabel.textContent = ""; // '+' 글자 숨기기
          }

          // 2. 비주얼 영역의 프로필 이미지 변경
          const visualImg = document.querySelector(`#${user} .Videos--users__profile img`);
          if (visualImg) {
            visualImg.src = imageURL;
          }
        }
      });
    });
  },

  renderAll() {
    this.renderTimeline("user1");
    this.renderTimeline("user2");
    this.syncVisual("user1", 0);
    this.syncVisual("user2", 0);

    // [추가] 데이터 렌더링 후 UI 버튼 상태들도 동기화
    this.updatePlayBtnUI();
    if (window.APP_UI) window.APP_UI.updateSortUI();
  },
};

window.APP_CORE = APP_CORE; 

document.addEventListener("DOMContentLoaded", () => APP_CORE.init());