const fullscreenBtn = document.querySelector("#fullscreenBtn");

fullscreenBtn.addEventListener("click", async () => {
  const visual = document.querySelector("#visual");

  if (!document.fullscreenElement) {
    await visual.requestFullscreen();

    /* 모바일 가로 회전 시도 */
    if (screen.orientation?.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch (e) {
        console.log("orientation lock fail");
      }
    }
  } else {
    await document.exitFullscreen();
  }
});
