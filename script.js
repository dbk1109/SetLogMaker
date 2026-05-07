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

const exportButton = document.querySelector("#exportVideo");

const fetchFile = async (file) => {
  return new Uint8Array(await file.arrayBuffer());
};

/* =========================
   초기 슬롯 생성
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

  timeline.innerHTML = "";

  state[user].forEach((slot, index) => {
    const item = document.createElement("div");

    item.className = "Timeline--item";
    item.dataset.id = slot.id;

    item.innerHTML = `
      <div class="thumb">
        ${
          slot.videoURL
            ? `
              <video
                src="${slot.videoURL}"
                muted
                playsinline
              ></video>
            `
            : `
              <span>${TIMES[index]}</span>
            `
        }
      </div>

      <textarea
        class="slot-text"
        data-index="${index}"
        placeholder="텍스트 입력"
      >${slot.text}</textarea>
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

  /* 기존 sortable 제거 */
  timeline._sortable?.destroy();

  timeline._sortable = new Sortable(timeline, {
    animation: 150,

    onEnd: (evt) => {
      const movedItem = state[user][evt.oldIndex];

      state[user].splice(evt.oldIndex, 1);

      state[user].splice(evt.newIndex, 0, movedItem);

      renderTimeline(user);
    },
  });
}

/* =========================
   업로드 처리
========================= */

document.querySelectorAll(".SettingUser").forEach((setting) => {
  const user = setting.dataset.user;

  const videoInput = setting.querySelector(".video-input");

  videoInput.addEventListener("change", (e) => {
    const files = [...e.target.files].slice(0, 12);

    files.forEach((file, index) => {
      if (!state[user][index]) return;

      /* 기존 URL 메모리 해제 */
      if (state[user][index].videoURL) {
        URL.revokeObjectURL(state[user][index].videoURL);
      }

      state[user][index].video = file;
      state[user][index].videoURL = URL.createObjectURL(file);
    });

    renderTimeline(user);

    syncVisual(user);
  });
});

/* =========================
   텍스트 입력
========================= */

document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("slot-text")) return;

  const user = e.target.closest(".SettingUser").dataset.user;

  const index = e.target.dataset.index;

  state[user][index].text = e.target.value;
});

/* =========================
   프로필 변경
========================= */

document.querySelectorAll(".SettingUser").forEach((setting) => {
  const user = setting.dataset.user;

  const profileInput = setting.querySelector(".profile-input");

  const nicknameInput = setting.querySelector(".nickname-input");

  /* 프로필 이미지 */
  profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    /* VISUAL 프로필 */
    document.querySelector(`#${user} .Videos--users__profile img`).src = url;

    /* 업로드 버튼 미리보기 */
    const preview = setting.querySelector(".profile-upload");

    preview.style.backgroundImage = `url(${url})`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";

    preview.textContent = "";
  });

  /* 닉네임 */
  nicknameInput.addEventListener("input", (e) => {
    document.querySelector(`#${user} .nickname`).textContent =
      e.target.value || user;
  });
});

/* =========================
   VISUAL 동기화
========================= */

function syncVisual(user, index = 0) {
  const slot = state[user][index];

  if (!slot) return;

  const back = document.querySelector(`#${user} .Videos--users__back`);

  back.innerHTML = "";

  /* VIDEO */
  if (slot.videoURL) {
    const video = document.createElement("video");

    video.src = slot.videoURL;

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    /* metadata 로드 후 재생 */
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0;

      video.play();
    });

    /* 최대 1초 */
    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= 1) {
        video.pause();

        video.currentTime = 1;
      }
    });

    back.appendChild(video);
  }

  /* 시간 */
  document.querySelector(`#${user} .Videos--users__middle h3`).textContent =
    TIMES[index];

  /* 텍스트 */
  document.querySelector(`#${user} .Videos--users__middle p`).textContent =
    slot.text || "💤";
}

/* =========================
   전체 재생
========================= */

document.querySelector("#playAll").addEventListener("click", async () => {
  if (isPlaying) return;

  isPlaying = true;

  const button = document.querySelector("#playAll");

  button.textContent = "재생 중...";

  for (let i = 0; i < 12; i++) {
    syncVisual("user1", i);

    syncVisual("user2", i);

    await wait(2000);
  }

  button.textContent = "테스트 재생";

  exportButton.style.display = "block";

  isPlaying = false;
});

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* =========================
   초기 렌더
========================= */

renderTimeline("user1");

renderTimeline("user2");

syncVisual("user1");

syncVisual("user2");

/* =========================
   EXPORT
========================= */

const { FFmpeg } = FFmpegWASM;

const ffmpeg = new FFmpeg();

async function loadFFmpeg() {
  if (ffmpeg.loaded) return;

  await ffmpeg.load({
    coreURL: "./ffmpeg/ffmpeg-core.js",
    wasmURL: "./ffmpeg/ffmpeg-core.wasm",
    workerURL: "./ffmpeg/ffmpeg-core.worker.js",
  });
}

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;

  exportButton.textContent = "영상 생성 중...";

  await loadFFmpeg();

  const tempVideos = [];

  for (let i = 0; i < 12; i++) {
    const slot1 = state.user1[i];
    const slot2 = state.user2[i];

    if (!slot1.video || !slot2.video) continue;

    const file1 = await fetchFile(slot1.video);
    const file2 = await fetchFile(slot2.video);

    const topName = `top_${i}.mp4`;
    const bottomName = `bottom_${i}.mp4`;

    await ffmpeg.writeFile(topName, file1);
    await ffmpeg.writeFile(bottomName, file2);

    const outputName = `merged_${i}.mp4`;

    await ffmpeg.exec([
      "-i",
      topName,

      "-i",
      bottomName,

      "-filter_complex",
      "[0:v]scale=420:200,setsar=1[top];[1:v]scale=420:200,setsar=1[bottom];[top][bottom]vstack=inputs=2[out]",

      "-map",
      "[out]",

      "-t",
      "1",

      "-preset",
      "ultrafast",

      outputName,
    ]);

    tempVideos.push(outputName);
  }

  /* concat 리스트 생성 */

  let concatText = "";

  tempVideos.forEach((name) => {
    concatText += `file '${name}'\n`;
  });

  await ffmpeg.writeFile(
    "concat.txt",
    new TextEncoder().encode(concatText)
  );

  /* 최종 합치기 */

  await ffmpeg.exec([
    "-f",
    "concat",

    "-safe",
    "0",

    "-i",
    "concat.txt",

    "-c",
    "copy",

    "final.mp4",
  ]);

  /* 파일 읽기 */

  const data = await ffmpeg.readFile("final.mp4");

  const videoBlob = new Blob(
    [data.buffer],
    { type: "video/mp4" }
  );

  const url = URL.createObjectURL(videoBlob);

  /* 다운로드 */

  const a = document.createElement("a");

  a.href = url;

  a.download = "setlog.mp4";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);

  exportButton.disabled = false;

  exportButton.textContent = "최종 영상 저장";
});

ffmpeg.on("log", ({ message }) => {
  console.log(message);
});