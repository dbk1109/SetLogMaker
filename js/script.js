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

  preloadNext(user, nextIndex) {
    const nextSlot = this.state[user][nextIndex];
    if (!nextSlot || !nextSlot.videoURL) return;

    // 이미 미리 불러온 영상이 있는지 확인 (중복 방지)
    const back = document.querySelector(`#${user} .Videos--users__back`);
    const isAlreadyLoaded = Array.from(back.querySelectorAll("video")).some(
      (v) => v.src === nextSlot.videoURL,
    );

    if (!isAlreadyLoaded) {
      const preVideo = document.createElement("video");
      preVideo.src = nextSlot.videoURL;
      preVideo.preload = "auto"; // 브라우저에게 미리 받으라고 명령
      preVideo.muted = true;
      preVideo.style.display = "none"; // 일단 숨김
      back.appendChild(preVideo);
    }
  },

  async startPlayback() {
    if (window.isPlaying) return;
    window.isPlaying = true;
    this.updatePlayBtnUI();

    for (let i = 0; i < this.TIMES.length; i++) {
      if (!window.isPlaying) break;

      // 현재 영상 재생
      this.syncVisual("user1", i);
      this.syncVisual("user2", i);
      this.updateDots(i);

      // [핵심] 현재 영상을 재생하자마자 '다음(i+1)' 영상을 미리 소환
      const nextIdx = (i + 1) % this.TIMES.length;
      this.preloadNext("user1", nextIdx);
      this.preloadNext("user2", nextIdx);

      for (let j = 0; j < 20; j++) {
        if (!window.isPlaying) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    this.stopPlayback();
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
    const back = view.querySelector(".Videos--users__back");
    const timeEl = view.querySelector(".Videos--users__middle h3");
    const textEl = view.querySelector(".Videos--users__middle p");

    // 1. 이전 영상 '즉시' 파괴 (좀비 방지)
    const oldVideos = back.querySelectorAll("video");
    oldVideos.forEach((v) => {
      // 미리 불러오기(display: none) 중인 영상은 지우지 말아야 함!
      if (v.style.display !== "none") {
        v.pause();
        v.src = "";
        v.remove();
      }
    });

    // 2. 텍스트 및 시간 즉시 업데이트 (0.9 오퍼시티 환경)
    timeEl.textContent = this.TIMES[index];
    back.style.backgroundColor = "#000";
    textEl.textContent = slot.text || (!slot.videoURL ? "💤" : "");

    // 3. 영상 처리
    if (slot.videoURL) {
      // 이미 preloadNext에서 만들어둔 영상이 있는지 확인
      let nextVideo = Array.from(back.querySelectorAll("video")).find(
        (v) => v.src === slot.videoURL,
      );

      if (nextVideo) {
        // 미리 로드된 영상이 있다면 즉시 노출
        Object.assign(nextVideo.style, {
          display: "block",
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: "0.9",
          zIndex: "10",
        });
        nextVideo.play().catch(() => {});
      } else {
        // 없다면 새로 생성 (첫 실행 대비)
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

  // [수정] 차기 영상을 미리 로드하는 함수
  preloadNext(user, nextIndex) {
    const nextSlot = this.state[user][nextIndex];
    if (!nextSlot || !nextSlot.videoURL) return;

    // 이미 미리 불러온 영상이 있는지 확인 (중복 방지)
    const back = document.querySelector(`#${user} .Videos--users__back`);
    const isAlreadyLoaded = Array.from(back.querySelectorAll("video")).some(
      (v) => v.src === nextSlot.videoURL,
    );

    if (!isAlreadyLoaded) {
      const preVideo = document.createElement("video");
      preVideo.src = nextSlot.videoURL;
      preVideo.preload = "auto"; // 브라우저에게 미리 받으라고 명령
      preVideo.muted = true;
      preVideo.style.display = "none"; // 일단 숨김
      back.appendChild(preVideo);
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