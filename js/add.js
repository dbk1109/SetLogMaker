function openPreviewWindow() {
  const visual = document.querySelector("#visual");

  if (!visual) return;

  const win = window.open("", "_blank", "width=390,height=844");

  if (!win) {
    alert("팝업 차단을 해제해줘");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>

        <style>
          body {
            margin: 0;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }

          .frame {
            width: 390px;
            height: 844px;
            overflow: hidden;
            background: black;
          }

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .Videos--users__back {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>

      <body>
        <div class="frame" id="frame"></div>
      </body>
    </html>
  `);

  win.document.close();

  const frame = win.document.querySelector("#frame");

  /* 👉 현재 visual DOM 그대로 복제 */
  const clone = visual.cloneNode(true);

  frame.appendChild(clone);

  /* 👉 비디오 자동 재생 재바인딩 */
  const videos = frame.querySelectorAll("video");

  videos.forEach((v) => {
    v.currentTime = 0;
    v.play().catch(() => {});
  });

  /* 👉 2초마다 user1/user2 교차 재생 */
  startLoop(frame);
}

function startLoop(frame) {
  const users = frame.querySelectorAll(".Videos--users");

  let index = 0;

  setInterval(() => {
    users.forEach((u, i) => {
      const video = u.querySelector("video");

      if (!video) return;

      if (i === index % users.length) {
        video.currentTime = 0;
        video.play();
      } else {
        video.pause();
      }
    });

    index++;
  }, 2000);
}

/* 버튼 연결 */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#openPreview");

  if (!btn) return;

  btn.addEventListener("click", openPreviewWindow);
});
