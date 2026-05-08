const TIMES = [
  "12:00",
  "1:00",
  "2:00",
  "3:00",
  "4:00",
  "5:00",
  "6:00",
  "7:00",
  "8:00",
  "9:00",
  "10:00",
  "11:00",
];

const state = {
  user1: [],
  user2: [],
};

let isPlaying = false;

/* =========================
   안전 DOM 접근
========================= */
const exportButton = document.querySelector("#exportVideo");

/* =========================
   슬롯 생성
========================= */
function createDefaultSlots(user) {
  state[user] = TIMES.map(() => ({
    id: crypto.randomUUID(),
    text: "",
    video: null,
    videoURL: "",
  }));
}

createDefaultSlots("user1");
createDefaultSlots("user2");

/* =========================
   타임라인 렌더
========================= */
function renderTimeline(user) {
  const timeline = document.querySelector(`#timeline-${user}`);
  if (!timeline) return;

  timeline.innerHTML = "";

  state[user].forEach((slot, index) => {
    const item = document.createElement("div");
    item.className = "Timeline--item";
    item.dataset.id = slot.id;

    item.innerHTML = `
      <div class="thumb">
        ${
          slot.videoURL
            ? `<video src="${slot.videoURL}" muted playsinline></video>`
            : `<span>${TIMES[index]}</span>`
        }
      </div>

      <textarea class="slot-text" data-index="${index}">${slot.text}</textarea>
    `;

    timeline.appendChild(item);
  });

  initSortable(user);
}

/* =========================
   SORTABLE
========================= */
function initSortable(user) {
  const timeline = document.querySelector(`#timeline-${user}`);
  if (!timeline) return;

  timeline._sortable?.destroy();

  timeline._sortable = new Sortable(timeline, {
    animation: 150,
    onEnd: (evt) => {
      const movedItem = state[user][evt.oldIndex];

      state[user].splice(evt.oldIndex, 1);
      state[user].splice(evt.newIndex, 0, movedItem);

      renderTimeline(user);
      syncVisual(user, 0);
    },
  });
}

/* =========================
   업로드
========================= */
document.querySelectorAll(".SettingUser").forEach((setting) => {
  const user = setting.dataset.user;
  const videoInput = setting.querySelector(".video-input");

  videoInput.addEventListener("change", (e) => {
    const files = [...e.target.files].slice(0, 12);

    files.forEach((file, index) => {
      if (!state[user][index]) return;

      if (state[user][index].videoURL) {
        URL.revokeObjectURL(state[user][index].videoURL);
      }

      state[user][index].video = file;
      state[user][index].videoURL = URL.createObjectURL(file);
    });

    renderTimeline(user);
    syncVisual(user, 0);
  });
});

/* =========================
   텍스트 입력 (핵심 수정)
========================= */
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("slot-text")) return;

  const user = e.target.closest(".SettingUser").dataset.user;
  const index = Number(e.target.dataset.index);

  state[user][index].text = e.target.value;

  syncVisual(user, index); // ⭐ 핵심
});

/* =========================
   프로필
========================= */
document.querySelectorAll(".SettingUser").forEach((setting) => {
  const user = setting.dataset.user;

  const profileInput = setting.querySelector(".profile-input");
  const nicknameInput = setting.querySelector(".nickname-input");

  profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const img = document.querySelector(`#${user} .Videos--users__profile img`);
    if (img) img.src = url;

    const preview = setting.querySelector(".profile-upload");
    preview.style.backgroundImage = `url(${url})`;
    preview.textContent = "";
  });

  nicknameInput.addEventListener("input", (e) => {
    const el = document.querySelector(`#${user} .nickname`);
    if (el) el.textContent = e.target.value || user;
  });
});


const dots = document.querySelectorAll(".Menu--dots span");

function setProgress(index) {
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}


/* =========================
   VISUAL 동기화
========================= */
function syncVisual(user, index = 0) {
  const slot = state[user][index];
  if (!slot) return;

  const back = document.querySelector(`#${user} .Videos--users__back`);
  const timeEl = document.querySelector(`#${user} .Videos--users__middle h3`);
  const textEl = document.querySelector(`#${user} .Videos--users__middle p`);

  if (!back || !timeEl || !textEl) return;

  back.innerHTML = "";

  if (slot.videoURL) {
    const video = document.createElement("video");

    video.src = slot.videoURL;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0;
      video.play();
    });

    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= 1) {
        video.pause();
        video.currentTime = 1;
      }
    });

    back.appendChild(video);
  }

  timeEl.textContent = TIMES[index];
  textEl.textContent = slot.text || "💤";
}

/* =========================
   재생
========================= */
document.querySelector("#playAll").addEventListener("click", async () => {
  if (isPlaying) return;

  isPlaying = true;
  const button = document.querySelector("#playAll");

  button.textContent = "재생 중...";

  for (let i = 0; i < 12; i++) {
    syncVisual("user1", i);
    syncVisual("user2", i);

    setProgress(i);

    await new Promise((r) => setTimeout(r, 2000));
  }

  button.textContent = "테스트 재생";
  isPlaying = false;
});

/* =========================
   초기 실행
========================= */
renderTimeline("user1");
renderTimeline("user2");
syncVisual("user1", 0);
syncVisual("user2", 0);

window.state = state;