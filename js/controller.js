const APP_UI = {
  // 모바일이면 초기 메뉴 열림 상태로 시작
  isMenuOpen: window.innerWidth <= 768,

  init() {
    this.cacheDOM();
    this.bindEvents();

    // 초기 UI 동기화
    this.updateMenuUI();
    this.updateSortUI();
    this.updatePlayBtnUI();
    this.handleFullscreenChange();
  },

  cacheDOM() {
    this.drawer = document.querySelector("#floatingDrawer");
    this.menuBtn = document.querySelector("#floatingMenuBtn");
    this.sortBtn = document.querySelector("#toggleSort");
    this.playBtn = document.querySelector("#playAll");
    this.fullscreenBtn = document.querySelector("#fullscreenBtn");
    this.playNotice = document.querySelector("#playNotice");
    this.playNoticeConfirm = document.querySelector("#playNoticeConfirm");
  },

  bindEvents() {
    // 전체화면
    this.fullscreenBtn?.addEventListener("click", () => {
      const el = document.querySelector("#fullscreenWrap");

      // 1. 표준 API 시도 (PC, 안드로이드, 아이패드)
      if (el.requestFullscreen) {
        if (!document.fullscreenElement) {
          el.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      }
      // 2. iOS 아이폰을 위한 대응 (CSS 클래스 토글)
      else {
        el.classList.toggle("ios-fullscreen");

        // 아이폰에서 상단 바/하단 바를 숨기기 위해 주소창 숨김 유도
        window.scrollTo(0, 0);
      }
    });

    document.addEventListener("fullscreenchange", () =>
      this.handleFullscreenChange(),
    );

    // 플로팅 메뉴
    this.menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isMenuOpen = !this.isMenuOpen;
      this.updateMenuUI();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".controller") && this.isMenuOpen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
      }
    });

    // 재생 제어
    this.playBtn?.addEventListener("click", () => {
      // 모바일 환경 체크 (768px 이하)
      const isMobile = window.innerWidth <= 768;
      const el = document.querySelector("#fullscreenWrap");
      const isFullscreen =
        !!document.fullscreenElement || el.classList.contains("ios-fullscreen");

      if (window.isPlaying) {
        window.APP_CORE.stopPlayback();
        return;
      }

      if (isMobile && isFullscreen) {
        // 메뉴 닫기
        this.isMenuOpen = false;
        this.updateMenuUI();

        // 경고창 띄우기
        if (this.playNotice) {
          this.playNotice.classList.add("active");
        }
      } else {
        // 그 외 (PC 환경이거나, 모바일이지만 전체화면이 아닐 때) 바로 재생
        window.APP_CORE.startPlayback();
      }
    });

    // 경고창 '확인' 버튼 클릭 시
    this.playNoticeConfirm?.addEventListener("click", () => {
      if (this.playNotice) {
        this.playNotice.classList.remove("active");
      }

      // 모바일 재생 시작 시에만 메뉴를 가리는 클래스 추가
      document.body.classList.add("is-playing");
      window.APP_CORE.startPlayback();
    });

    // [중요] 정렬 잠금 토글 및 클래스 부여
    this.sortBtn?.addEventListener("click", () => {
      window.isSortLocked = !window.isSortLocked;
      this.updateSortUI();

      // Sortable 객체 상태 업데이트
      ["user1", "user2"].forEach((u) => {
        const el = document.querySelector(`#timeline-${u}`);
        if (el?._sortable) el._sortable.option("disabled", window.isSortLocked);
      });
    });

    this.bindSettingEvents();
  },

  updateMenuUI() {
    if (!this.drawer || !this.menuBtn) return;
    this.drawer.classList.toggle("active", this.isMenuOpen);
    this.menuBtn.classList.toggle("active", this.isMenuOpen);
    this.menuBtn.innerHTML = this.isMenuOpen
      ? `<i class="fa-solid fa-xmark"></i>`
      : `<i class="fa-solid fa-ellipsis"></i>`;
  },

  handleFullscreenChange() {
    const isFS = !!document.fullscreenElement;
    if (!isFS && window.isPlaying) window.APP_CORE.stopPlayback();

    if (this.fullscreenBtn) {
      this.fullscreenBtn.innerHTML = isFS
        ? `<i class="fa-solid fa-compress"></i> <span>닫기</span>`
        : `<i class="fa-solid fa-expand"></i> <span>녹화준비</span>`;
    }
    if (!isFS)
      document.querySelector(".controller")?.classList.remove("is-hidden");
  },

  updateSortUI() {
    if (!this.sortBtn) return;
    const isLocked = window.isSortLocked;

    // 버튼 스타일
    this.sortBtn.className = `btn btn-drawer ${isLocked ? "is-locked" : "is-unlocked"}`;
    this.sortBtn.innerHTML = isLocked
      ? `<i class="fa-solid fa-lock"></i> <span>잠금됨</span>`
      : `<i class="fa-solid fa-lock-open"></i> <span>이동 가능</span>`;

    // [중요] SCSS 커서 제어를 위해 body에 클래스 토글
    document.body.classList.toggle("sort-unlocked", !isLocked);
  },

  updatePlayBtnUI() {
    if (!this.playBtn) return;
    if (window.isPlaying) {
      this.playBtn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>일시정지</span>`;
    } else {
      this.playBtn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${window.innerWidth <= 768 ? "재생" : "전체 재생"}</span>`;
    }
  },

  initDots(playableIndexes) {
    const container = document.querySelector(".Menu--dots");
    if (!container) return;

    container.innerHTML = "";
    const count = Math.min(playableIndexes.length, 9);

    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      container.appendChild(dot);
    }
  },

  updateDots(currentIndex, playableIndexes) {
    const container = document.querySelector(".Menu--dots");
    if (!container || !playableIndexes) return;

    const dots = container.querySelectorAll("span");
    const activePos = playableIndexes.indexOf(currentIndex);
    const total = playableIndexes.length;

    // 9개 점 중에서 불이 들어올 위치(0~8) 계산
    let visualIdx = 0;

    if (total <= 9) {
      // 1. 전체가 9개 이하면 인덱스 그대로 사용
      visualIdx = activePos;
    } else {
      // 2. 전체가 9개 초과일 때
      if (activePos < 5) {
        // 초반 5개 구간: 인덱스 그대로 (0,1,2,3,4)
        visualIdx = activePos;
      } else if (activePos >= total - 4) {
        // 후반 4개 구간: 뒤에서부터 계산 (5,6,7,8)
        // 예: total 24, activePos 23(마지막) -> 9 - (24-23) = 8번 인덱스
        visualIdx = 9 - (total - activePos);
      } else {
        // 중간 구간: 무조건 5번째 점(인덱스 4)에 고정
        visualIdx = 4;
      }
    }

    // 클래스 교체 (가장 가벼운 방식)
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === visualIdx);
      dot.classList.toggle("prev", idx < visualIdx);
    });
  },

  // [추가] 로컬 저장소에 현재 상태 저장
  saveToLocalStorage() {
    try {
      const data = window.APP_CORE.getStorageData();
      localStorage.setItem("APP_SAVE_DATA", JSON.stringify(data));
      console.log("저장되었습니다.");
    } catch (e) {
      alert("저장 공간이 부족하거나 보안 설정으로 인해 저장할 수 없습니다.");
    }
  },

  // 로컬 저장소에서 데이터 불러오기
  loadFromLocalStorage() {
    const saved = localStorage.getItem("APP_SAVE_DATA");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      // 1. 데이터(텍스트/닉네임) 적용
      window.APP_CORE.applyStorageData(data);

      // 2. [중요] 복구된 데이터를 기반으로 타임라인/비주얼 화면 전체 갱신
      window.APP_CORE.renderAll();

      // 3. 기타 상단 타이틀 및 시간 설정 UI 복구
      const titleInput = document.querySelector("#titleTextChange");
      if (titleInput && data.title) {
        titleInput.value = data.title;
        const titleDisplay = document.querySelector(".title--text p");
        if (titleDisplay) titleDisplay.textContent = data.title;
      }

      const timeToggle = document.querySelector("#timeFormatToggle");
      if (timeToggle) timeToggle.checked = data.is24h;
    } catch (e) {
      console.error("데이터 복구 실패", e);
    }
  },

  bindSettingEvents() {
    // 시간제 변경 토글 이벤트
    const timeToggle = document.querySelector("#timeFormatToggle");
    timeToggle?.addEventListener("change", (e) => {
      window.APP_CORE.state.is24h = e.target.checked;
      window.APP_CORE.renderAll(); // 전체 다시 렌더링하여 시간 텍스트 교체
      this.saveToLocalStorage(); //저장
    });

    // 타이틀 변경
    const titleInput = document.querySelector("#titleTextChange");
    titleInput?.addEventListener("input", (e) => {
      let value = e.target.value;

      // 점수 계산 로직 조정
      let totalScore = 0;
      let limitIndex = 0;

      for (let i = 0; i < value.length; i++) {
        // 한글은 2점, 영문/숫자/공백은 1.1점 (영문이 너무 길어지지 않게 조정)
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(value[i]);
        totalScore += isKorean ? 2 : 1.1;

        // 총점 16점 제한 (한글 8자 = 16점 / 영문 약 14자 = 15.4점)
        if (totalScore <= 16) {
          limitIndex = i + 1;
        } else {
          break;
        }
      }

      // 점수 초과 시 자르기
      if (totalScore > 16) {
        value = value.substring(0, limitIndex);
        e.target.value = value;
      }

      const targetTitle = document.querySelector(".title--text p");
      if (targetTitle) {
        targetTitle.textContent = value || "💚💜";
      }
    });

    // 텍스트 실시간 반영 (수정 및 최적화)
    document.addEventListener("input", (e) => {
      if (
        e.target.classList.contains("slot-text") ||
        e.target.id === "titleTextChange"
      ) {
        const settingUser = e.target.closest(".SettingUser");
        if (!settingUser) return;

        const user = settingUser.dataset.user;
        const itemId = e.target.closest(".Timeline--item").dataset.id; // dataset.id 확인

        // find 조건에서 item.id === itemId로 확실히 매칭
        const targetItem = window.APP_CORE.state[user].find(
          (item) => item.id === itemId,
        );

        if (targetItem) {
          targetItem.text = e.target.value;
          const currentIndex = window.APP_CORE.state[user].indexOf(targetItem);

          // 현재 재생 중이거나 선택된 인덱스인 경우에만 visual 업데이트
          // (전체 재생 중이 아닐 때 현재 슬롯의 텍스트 수정을 바로 보기 위함)
          window.APP_CORE.syncVisual(user, currentIndex);
        }
      }
    });

    // 프로필 업로드
    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          const label = e.target
            .closest(".SettingUser--profile")
            .querySelector(".profile-upload");
          if (label) {
            label.style.backgroundImage = `url(${url})`;
            label.textContent = "";
          }
          const img = document.querySelector(
            `#${user} .Videos--users__profile img`,
          );
          if (img) img.src = url;
        }
      });
    });

    // 닉네임
    document.querySelectorAll(".nickname-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const target = document.querySelector(`#${user} .nickname`);
        if (target) target.textContent = e.target.value || user;
      });
    });

    // 영상 일괄 업로드
    document.querySelectorAll(".video-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const user = e.target.closest(".SettingUser").dataset.user;
        const files = Array.from(e.target.files).slice(0, 24);
        files.forEach((file, i) => {
          if (window.APP_CORE.state[user][i]) {
            if (window.APP_CORE.state[user][i].videoURL)
              URL.revokeObjectURL(window.APP_CORE.state[user][i].videoURL);
            window.APP_CORE.state[user][i].videoURL = URL.createObjectURL(file);
          }
        });
        window.APP_CORE.renderTimeline(user);
        window.APP_CORE.syncVisual(user, 0);
      });
    });

    // 삭제 버튼
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-video-btn");
      if (!btn) return;
      const { user, id } = btn.dataset;
      const target = window.APP_CORE.state[user].find((item) => item.id === id);
      if (target && confirm("해당 영상을 삭제하시겠습니까?")) {
        URL.revokeObjectURL(target.videoURL);
        target.videoURL = "";
        window.APP_CORE.renderTimeline(user);
        window.APP_CORE.syncVisual(user, 0);
      }
    });

    // 수동 저장
    const saveBtn = document.querySelector("#saveDataBtn");
    saveBtn?.addEventListener("click", () => {
      // 1. 실제 데이터 저장 실행
      this.saveToLocalStorage();

      // 2. 버튼 시각 피드백 (성공 알림)
      const originalHTML = saveBtn.innerHTML;
      saveBtn.classList.add("success");
      saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>저장 완료!</span>`;

      // 3. 1초 후 버튼 원래대로 복구
      setTimeout(() => {
        saveBtn.classList.remove("success");
        saveBtn.innerHTML = originalHTML;
      }, 1000);
    });

    // 전체 삭제 기능
    const clearBtn = document.querySelector("#clearAllBtn");
    clearBtn?.addEventListener("click", () => {
      if (
        confirm("모든 텍스트와 설정이 초기화됩니다. 정말 삭제하시겠습니까?")
      ) {
        // 1. 메모리상의 데이터 초기화
        window.APP_CORE.clearAllData();

        // 2. 로컬스토리지에 저장된 데이터 영구 삭제
        localStorage.removeItem("APP_SAVE_DATA");

        // 3. 사용자 피드백
        alert("모든 데이터가 삭제되었습니다.");
      }
    });
  },

  performVideoExchange(newVideo, backElement) {
    const oldVideos = Array.from(
      backElement.querySelectorAll("video.active")
    );

    newVideo.style.visibility = "visible";

    const playPromise = newVideo.play();

    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        console.log("재생 실패", e);
      });
    }

    const activateNewVideo = () => {
      newVideo.classList.add("active");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          oldVideos.forEach((v) => {
            if (v !== newVideo) {
              v.classList.remove("active");
              v.pause();
              v.src = "";
              v.remove();
            }
          });
        });
      });
    };

    // 첫 프레임 표시 보장
    if ("requestVideoFrameCallback" in newVideo) {
      newVideo.requestVideoFrameCallback(() => {
        activateNewVideo();
      });
    } else {
      // Safari fallback
      setTimeout(activateNewVideo, 220);
    }
  },
  createPreloadVideo(user, index, url) {
    const view = document.querySelector(`#${user}`);
    const back = view.querySelector(".Videos--users__back");

    const nextVideo = document.createElement("video");
    nextVideo.src = url;
    nextVideo.preload = "auto";
    nextVideo.muted = true;
    nextVideo.playsInline = true;
    nextVideo.dataset.preload = index;
    nextVideo.dataset.ready = "false";
    nextVideo.style.visibility = "hidden";
    nextVideo.style.pointerEvents = "none";

    nextVideo.onended = () => {
      nextVideo.pause();
    };
    // [추가] 영상 길이에 맞춰 재생 속도 조절
    nextVideo.onloadedmetadata = () => {
      const duration = nextVideo.duration;
      if (duration > 0 && duration < 2) {
        // 2초를 채우기 위한 속도 계산 (예: 1초면 0.5배속)
        // 최소 속도를 0.1 정도로 제한하여 멈춤 방지
        nextVideo.playbackRate = Math.max(0.1, duration / 2);
      }
    };

    nextVideo.oncanplay = () => {
      nextVideo.dataset.ready = "true";
    };
    nextVideo.onerror = () => {
      // revoke / cleanup 무시
      if (nextVideo.networkState === 3 || nextVideo.error?.code === 1) {
        return;
      }

      console.warn("영상 로드 실패", url);

      // state 자체를 black fallback으로 교체
      const targetSlot = window.APP_CORE.state[user][index];

      if (targetSlot) {
        targetSlot.videoURL = window.APP_CORE.EMPTY_VIDEO;
      }

      nextVideo.dataset.ready = "error";

      nextVideo.pause();
      nextVideo.removeAttribute("src");
      nextVideo.load();
      nextVideo.remove();
    };
    back.appendChild(nextVideo);
    nextVideo.load();
  },
};

window.APP_UI = APP_UI;
document.addEventListener("DOMContentLoaded", () => APP_UI.init());
