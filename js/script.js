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
      animation: 200,
      easing: "cubic-bezier(0.2, 1, 0.3, 1)",
      disabled: window.isSortLocked,
      ghostClass: "sortable-ghost",
      dragClass: "sortable-drag",
      forceFallback: true,
      fallbackOnBody: true,

      onEnd: (evt) => {
        // 1. 실제 DOM에서 모든 아이템을 가져와서 ID 순서 추출
        const allItems = Array.from(el.querySelectorAll(".Timeline--item"));
        const newOrderIds = allItems.map((item) => item.dataset.id);

        // 2. 데이터(state) 재정렬
        this.state[user].sort((a, b) => {
          return newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id);
        });

        // 3. [핵심] 시간 텍스트와 인덱스 데이터만 부분 업데이트 (전체 렌더링 X)
        allItems.forEach((item, i) => {
          // 비디오가 없는 경우 보여주는 시간 숫자(span) 업데이트
          const thumbSpan = item.querySelector(".thumb span");
          if (thumbSpan) {
            thumbSpan.textContent = this.TIMES[i];
          }

          // textarea의 data-index 값도 현재 순서에 맞게 갱신 (나중에 텍스트 입력 시 필요)
          const textarea = item.querySelector(".slot-text");
          if (textarea) {
            textarea.dataset.index = i;
          }
        });

        // 4. 비주얼 영역 즉시 동기화
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

    // 1. 시간 표시
    timeEl.textContent = this.TIMES[index];

    // 2. [수정] 요청하신 4가지 규칙 적용
    if (!slot.videoURL && !slot.text) {
      // 규칙 1: 영상 없고 텍스트 없으면 -> 💤
      textEl.textContent = "💤";
    } else if (slot.text) {
      // 규칙 3, 4: 텍스트가 있으면 -> 무조건 텍스트 출력
      textEl.textContent = slot.text;
    } else {
      // 규칙 2: 영상 있고 텍스트 없으면 -> 빈 텍스트
      textEl.textContent = "";
    }

    // 3. 배경 처리 (기존의 깜빡임 방지 로직)
    if (slot.videoURL) {
      const nextVideo = document.createElement('video');
      nextVideo.src = slot.videoURL;
      nextVideo.muted = true;
      nextVideo.autoplay = true;
      nextVideo.loop = true;
      nextVideo.playsInline = true;

      nextVideo.style.position = "absolute";
      nextVideo.style.inset = "0";
      nextVideo.style.width = "100%";
      nextVideo.style.height = "100%";
      nextVideo.style.objectFit = "cover";
      nextVideo.style.zIndex = "10";

      back.appendChild(nextVideo);
      nextVideo.play().catch(() => {});

      setTimeout(() => {
        const allVideos = back.querySelectorAll('video');
        allVideos.forEach(v => {
          if (v !== nextVideo) {
            v.pause();
            v.remove();
          }
        });
      }, 150);
    } else {
      // 영상이 없으면 까만 배경
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
        const itemId = e.target.closest(".Timeline--item").dataset.id; // index 대신 ID 사용

        const targetItem = this.state[user].find((item) => item.id === itemId);
        if (targetItem) {
          targetItem.text = e.target.value;
          // 현재 재생 중인 인덱스를 찾아 비주얼 동기화
          const currentIndex = this.state[user].indexOf(targetItem);
          this.syncVisual(user, currentIndex);
        }
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
          const uploadLabel = e.target
            .closest(".SettingUser--profile")
            .querySelector(".profile-upload");
          if (uploadLabel) {
            uploadLabel.style.backgroundImage = `url(${imageURL})`;
            uploadLabel.textContent = ""; // '+' 글자 숨기기
          }

          // 2. 비주얼 영역의 프로필 이미지 변경
          const visualImg = document.querySelector(
            `#${user} .Videos--users__profile img`,
          );
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