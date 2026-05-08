const fullscreenBtn = document.querySelector("#fullscreenBtn");

fullscreenBtn.addEventListener("click", async () => {
  const visual = document.querySelector("#visual");

  if (!document.fullscreenElement) {
    await visual.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});
