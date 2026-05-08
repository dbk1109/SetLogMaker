const fullscreenBtn = document.querySelector("#fullscreenBtn");

fullscreenBtn.addEventListener("click", async () => {
  const wrap = document.querySelector("#fullscreenWrap");

  if (!document.fullscreenElement) {
    await wrap.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});
