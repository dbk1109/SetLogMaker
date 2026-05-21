/* ========================================================
   SETLOG MAKER MVP3 - UI Controller & Local Storage
   Filename: controller2.js
   Description: DOM 이벤트 바인딩, 드로어 제어, IndexedDB 입출력
======================================================== */

/* =========================
  INDEXEDDB VIDEO STORAGE
========================= */
const VideoDB = {
  DB_NAME: "SetlogVideoDB",
  STORE_NAME: "videos",

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(this.STORE_NAME);
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async save(slotId, user, file) {
    if (!file) return;
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).put(file, `${slotId}_${user}`);
  },

  async load(slotId, user) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const request = tx.objectStore(this.STORE_NAME).get(`${slotId}_${user}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  },

  async delete(slotId, user) {
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).delete(`${slotId}_${user}`);
  },

  async clear() {
    const db = await this.open();
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    tx.objectStore(this.STORE_NAME).clear();
  },
};

/* =========================
  MAIN APP UI CONTROLLER
========================= */
const APP_UI = {
  isMenuOpen: window.innerWidth <= 768,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadFromLocalStorage();

    this.updateMenuUI();
    this.updatePlayBtnUI();
    this.handleFullscreenChange();
  },

  cacheDOM() {
    this.drawer = document.querySelector("#floatingDrawer");
    this.menuBtn = document.querySelector("#floatingMenuBtn");
    this.playBtn = document.querySelector("#playAll");
    this.fullscreenBtn = document.querySelector("#fullscreenBtn");
    this.playNotice = document.querySelector("#playNotice");
    this.playNoticeConfirm = document.querySelector("#playNoticeConfirm");
  },

  bindEvents() {
    // 전체화면 토글
    this.fullscreenBtn?.addEventListener("click", () => {
      const el = document.querySelector("#fullscreenWrap");
      if (!el) return;

      if (el.requestFullscreen) {
        if (!document.fullscreenElement) {
          el.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      } else {
        el.classList.toggle("ios-fullscreen");
        window.scrollTo(0, 0);
      }
    });

    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // 플로팅 메뉴 제어
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

    // 전체 재생 트리거
    this.playBtn?.addEventListener("click", () => {
      const isMobile = window.innerWidth <= 768;
      const el = document.querySelector("#fullscreenWrap");
      const isFullscreen = !!document.fullscreenElement || el?.classList.contains("ios-fullscreen");

      if (window.isPlaying) {
        window.APP_CORE.stopPlayback();
        return;
      }

      if (isMobile && isFullscreen) {
        this.isMenuOpen = false;
        this.updateMenuUI();
        if (this.playNotice) {
          this.playNotice.classList.add("active");
        } else {
          window.APP_CORE.startPlayback();
        }
      } else {
        window.APP_CORE.startPlayback();
      }
    });

    this.playNoticeConfirm?.addEventListener("click", () => {
      if (this.playNotice) this.playNotice.classList.remove("active");
      document.body.classList.add("is-playing");
      window.APP_CORE.startPlayback();
    });

    const initScrollGradient = () => {
      const timeBlocks = document.querySelector(".timeline");
      const container = document.querySelector("#timeBlocks");
      
      if (!timeBlocks || !container) return;

      const updateGradientStatus = () => {
        const scrollLeft = timeBlocks.scrollLeft;
        const maxScroll = timeBlocks.scrollWidth - timeBlocks.clientWidth;

        // 1. 맨 왼쪽에 붙어있는가?
        if (scrollLeft <= 4) { // 오차 범위를 4px로 약간 넓혀 안전성 강화
          container.classList.add("is-at-start");
        } else {
          container.classList.remove("is-at-start");
        }

        // 2. 맨 오른쪽에 완전히 도달했는가? 또는 스크롤바가 생길 필요가 없는 상태인가?
        if (maxScroll <= 0 || scrollLeft >= maxScroll - 4) {
          container.classList.add("is-at-end");
        } else {
          container.classList.remove("is-at-end");
        }
      };

      // 스크롤 및 화면 크기 변화 감지 바인딩
      timeBlocks.removeEventListener("scroll", updateGradientStatus);
      timeBlocks.addEventListener("scroll", updateGradientStatus);
      
      window.removeEventListener("resize", updateGradientStatus);
      window.addEventListener("resize", updateGradientStatus);
      
      // 전역 스코프에 함수를 열어두어 필요시 코어 엔진에서 트리거할 수 있게 브릿지 연결
      window.APP_UI.refreshScrollGradient = updateGradientStatus;

      // 즉시 및 레이턴시 보정 체크
      updateGradientStatus();
      setTimeout(updateGradientStatus, 400);
    };

    // DOMContentLoaded 대기문을 제거하고, 함수 선언 즉시 실행합니다.
    initScrollGradient();

    this.bindDynamicEvents();
  },

  bindDynamicEvents() {
    document.addEventListener("change", async (e) => {
      if (e.target.matches(".btn--upload input")) {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        const user = input.dataset.user;
        const index = Number(input.dataset.index);
        const slot = window.APP_CORE.state.slots[index];
        if (!slot) return;

        if (slot[user].videoURL) URL.revokeObjectURL(slot[user].videoURL);

        slot[user].video = file;
        slot[user].videoURL = URL.createObjectURL(file);

        await VideoDB.save(slot.id, user, file);

        window.APP_CORE.renderTimeline();
        window.APP_CORE.updateCurrentVisual();
        this.saveToLocalStorage();
      }
    });

    /* 타임라인 내부 텍스트 수정 시 로컬 스토리지 즉시 동기화 */
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("slot-text")) {
        const input = e.target;
        // user 데이터셋 바인딩 보정
        const user = input.dataset.user || (input.closest("#timeline-user1") ? "user1" : "user2");
        const index = Number(input.dataset.index);
        const slot = window.APP_CORE.state.slots[index];

        if (slot) {
          slot[user].text = input.value;
          
          // 글자 타이핑 시에는 무거운 비디오 재생기 리셋 없이 텍스트 노드와 도트만 실시간 미러링
          if (window.APP_CORE.currentIndex === index) {
            const visual = document.querySelector(`#${user}`);
            if (visual) {
              const textEl = visual.querySelector(".Videos--users__middle p");
              const hasVideo = !!slot[user].videoURL;
              const hasText = input.value && input.value.trim() !== "";

              if (textEl) {
                if (hasVideo && !hasText) {
                  textEl.textContent = "";
                } else if (!hasVideo && !hasText) {
                  textEl.textContent = "💤";
                } else {
                  textEl.textContent = input.value;
                }
              }
            }
          }
          
          // 24개 서클 인디케이터 상태 실시간 업데이트
          if (window.APP_CORE && typeof window.APP_CORE.render24CircleIndicators === "function") {
            window.APP_CORE.render24CircleIndicators();
          }

          this.saveToLocalStorage(); 
        }
      }
    });

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".delete-video-btn, .btn--delete_video");
      if (!btn) return;

      const user = btn.dataset.user || (btn.closest("#timeline-user1") ? "user1" : "user2");
      const index = Number(btn.dataset.index);
      
      const slot = window.APP_CORE.state.slots[index];
      if (slot && confirm("해당 영상을 삭제하시겠습니까?")) {
        if (slot[user].videoURL) URL.revokeObjectURL(slot[user].videoURL);
        slot[user].video = null;
        slot[user].videoURL = "";
        
        await VideoDB.delete(slot.id, user);

        window.APP_CORE.renderTimeline();
        window.APP_CORE.updateCurrentVisual();
        this.saveToLocalStorage();
      }
    });

    this.bindSettingEvents();
  },

  bindSettingEvents() {
    const timeToggle = document.querySelector("#timeFormatToggle");
    timeToggle?.addEventListener("change", (e) => {
      window.APP_CORE.state.is24h = e.target.checked;
      window.APP_CORE.renderTimeline();
      window.APP_CORE.updateCurrentVisual();
      this.saveToLocalStorage();
    });

    const titleInput = document.querySelector("#titleTextChange");
    titleInput?.addEventListener("input", (e) => {
      let value = e.target.value;
      let totalScore = 0;
      let limitIndex = 0;

      for (let i = 0; i < value.length; i++) {
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(value[i]);
        totalScore += isKorean ? 2 : 1.1;
        if (totalScore <= 16) {
          limitIndex = i + 1;
        } else {
          break;
        }
      }

      if (totalScore > 16) {
        value = value.substring(0, limitIndex);
        e.target.value = value;
      }

      window.APP_CORE.state.title = value;
      const targetTitle = document.querySelector(".title--text p");
      if (targetTitle) targetTitle.textContent = value || "💚💜";
      
      this.saveToLocalStorage();
    });

    document.querySelectorAll(".profile-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const profileBox = e.target.closest(".users--profile");
        if (!profileBox) return;
        
        const isUser1 = e.target.id === "profile-user1";
        const user = isUser1 ? "user1" : "user2";
        const file = e.target.files[0];
        
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Url = event.target.result;
            
            const label = profileBox.querySelector(".users--profile__img");
            if (label) {
              label.style.backgroundImage = `url(${base64Url})`;
              label.style.backgroundSize = "cover";
              label.style.backgroundPosition = "center";
              label.textContent = "";
            }
            const img = document.querySelector(`#${user} .Videos--users__profile img`);
            if (img) img.src = base64Url;

            if (!window.APP_CORE.state.profiles) window.APP_CORE.state.profiles = {};
            window.APP_CORE.state.profiles[user] = base64Url;
            this.saveToLocalStorage();
          };
          reader.readAsDataURL(file);
        }
      });
    });

    document.querySelectorAll(".users--profile__nickname").forEach((input) => {
      input.addEventListener("input", (e) => {
        const profileBox = e.target.closest(".users--profile");
        const isUser1 = profileBox?.querySelector(".profile-input")?.id === "profile-user1";
        const user = isUser1 ? "user1" : "user2";
        const value = e.target.value;
        
        const target = document.querySelector(`#${user} .nickname`);
        if (target) target.textContent = value || user;

        if (!window.APP_CORE.state.nicknames) window.APP_CORE.state.nicknames = {};
        window.APP_CORE.state.nicknames[user] = value;
        this.saveToLocalStorage();
      });
    });

    const clearBtn = document.querySelector("#clearAllBtn");
    clearBtn?.addEventListener("click", async () => {
      if (confirm("모든 데이터와 프로필 설정이 초기화됩니다. 정말 삭제하시겠습니까?")) {
        window.APP_CORE.clearAllData();
        localStorage.removeItem("APP_SAVE_DATA");
        
        window.APP_CORE.state.profiles = { user1: "", user2: "" };
        window.APP_CORE.state.nicknames = { user1: "", user2: "" };

        document.querySelectorAll(".users--profile__img").forEach(lbl => {
          lbl.style.backgroundImage = "";
          lbl.innerHTML = "+ <br> 프로필";
        });
        document.querySelectorAll(".users--profile__nickname").forEach(inp => inp.value = "");
        
        const p1Img = document.querySelector("#user1 .Videos--users__profile img");
        if (p1Img) p1Img.src = "";
        const p2Img = document.querySelector("#user2 .Videos--users__profile img");
        if (p2Img) p2Img.src = "";
        const n1Text = document.querySelector("#user1 .nickname");
        if (n1Text) n1Text.textContent = "user1";
        const n2Text = document.querySelector("#user2 .nickname");
        if (n2Text) n2Text.textContent = "user2";

        await VideoDB.clear();
        alert("모든 데이터가 삭제되었습니다.");
      }
    });
  },

  /* =========================
     VIEWPORT COMPONENT UPDATES
  ========================= */

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
    if (!isFS) document.querySelector(".controller")?.classList.remove("is-hidden");
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
    if (!container || !playableIndexes) return;
    container.innerHTML = "";
    
    const total = playableIndexes.length;

    // 조건 2 & 3 분기 처리
    if (total <= 10) {
      // [10개 이하] 활성 상태인 개수만큼 정직하게 다 보여주고 중앙 정렬
      container.classList.add("justify-center");
      
      for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        container.appendChild(dot);
      }
    } else {
      // [10개 초과] 기존에 설정한 움직이는 도트 메커니즘 유지 (최대 9개 노출)
      container.classList.remove("justify-center");
      
      const count = Math.min(total, 9);
      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        container.appendChild(dot);
      }
    }
  },

  updateDots(currentIndex, playableIndexes) {
    const container = document.querySelector(".Menu--dots");
    if (!container || !playableIndexes) return;

    const dots = container.querySelectorAll("span");
    const activePos = playableIndexes.indexOf(currentIndex);
    const total = playableIndexes.length;

    if (total === 0 || activePos === -1) return;

    let visualIdx = 0;

    // 조건 2 & 3에 따른 활성화 포지션 매칭
    if (total <= 10) {
      // 10개 이하일 때는 스크롤 이동 없이 실제 인덱스 위치에 active 부여
      visualIdx = activePos;
      
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === visualIdx);
        dot.classList.remove("prev"); // 중앙 정렬일 때는 prev 그라데이션 제거
      });
    } else {
      // 10개 초과일 때: 기존 작성하신 움직이는 정밀 알고리즘 그대로 유지
      if (total <= 9) {
        visualIdx = activePos !== -1 ? activePos : 0;
      } else {
        if (activePos < 5) {
          visualIdx = activePos !== -1 ? activePos : 0;
        } else if (activePos >= total - 4) {
          visualIdx = 9 - (total - activePos);
        } else {
          visualIdx = 4;
        }
      }

      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === visualIdx);
        dot.classList.toggle("prev", idx < visualIdx); // 기존 그라데이션 효과 유지
      });
    }
  },

  saveToLocalStorage() {
    try {
      // 저장 시작 상태 표시
      const statusEl = document.querySelector("#autoSaveStatus");
      if (statusEl) {
        statusEl.style.opacity = "1";
        statusEl.textContent = "🔄 저장 중...";
        statusEl.style.color = "#ffb703";
      }

      const data = window.APP_CORE.getStorageData();
      localStorage.setItem("APP_SAVE_DATA", JSON.stringify(data));

      // 디바운스/타임아웃 효과로 자연스럽게 "저장 완료"로 전환
      setTimeout(() => {
        if (statusEl) {
          statusEl.textContent = "🟢 저장 완료";
          statusEl.style.color = "#80ed99"; // 완료를 나타내는 편안한 초록 계열
          
          // 3초 뒤에 살짝 흐리게 만들어 시선 강탈 방지
          setTimeout(() => {
            statusEl.style.opacity = "0.5";
          }, 3000);
        }
      }, 400); // 0.4초 정도 저장 중 연출을 주어 인지하기 쉽게 만듭니다.

    } catch (e) {
      console.error("데이터 백업 실패", e);
      // 에러 발생 시 피드백
      const statusEl = document.querySelector("#autoSaveStatus");
      if (statusEl) {
        statusEl.textContent = "❌ 저장 실패";
        statusEl.style.color = "#ff4d6d";
      }
    }
  },

  async loadFromLocalStorage() {
    const saved = localStorage.getItem("APP_SAVE_DATA");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      window.APP_CORE.applyStorageData(data);

      for (const slot of window.APP_CORE.state.slots) {
        const file1 = await VideoDB.load(slot.id, "user1");
        if (file1) {
          if (slot.user1.videoURL) URL.revokeObjectURL(slot.user1.videoURL);
          slot.user1.videoURL = URL.createObjectURL(file1);
        }

        const file2 = await VideoDB.load(slot.id, "user2");
        if (file2) {
          if (slot.user2.videoURL) URL.revokeObjectURL(slot.user2.videoURL);
          slot.user2.videoURL = URL.createObjectURL(file2);
        }
      }

      window.APP_CORE.renderAll();

      ["user1", "user2"].forEach((user) => {
        const profilePic = window.APP_CORE.state.profiles?.[user];
        const nicknameVal = window.APP_CORE.state.nicknames?.[user];

        const profileInput = document.querySelector(user === "user1" ? "#profile-user1" : "#profile-user2");
        const profileBox = profileInput?.closest(".users--profile");
        if (profileBox && profilePic) {
          const label = profileBox.querySelector(".users--profile__img");
          if (label) {
            label.style.backgroundImage = `url(${profilePic})`;
            label.style.backgroundSize = "cover";
            label.style.backgroundPosition = "center";
            label.textContent = "";
          }
        }
        const nicknameInput = profileBox?.querySelector(".users--profile__nickname");
        if (nicknameInput && nicknameVal) {
          nicknameInput.value = nicknameVal;
        }

        const mainImg = document.querySelector(`#${user} .Videos--users__profile img`);
        if (mainImg && profilePic) mainImg.src = profilePic;
        
        const mainNick = document.querySelector(`#${user} .nickname`);
        if (mainNick && nicknameVal) mainNick.textContent = nicknameVal;
      });

      const titleInput = document.querySelector("#titleTextChange");
      if (titleInput && data.title) {
        titleInput.value = data.title;
        const titleDisplay = document.querySelector(".title--text p");
        if (titleDisplay) titleDisplay.textContent = data.title;
      }

      const timeToggle = document.querySelector("#timeFormatToggle");
      if (timeToggle) timeToggle.checked = data.is24h;
    } catch (e) {
      console.error("데이터 롤백 오류", e);
    }
  },

  performVideoExchange(newVideo, backElement, timeEl, targetTime, textEl, targetText) {
    const oldVideos = Array.from(backElement.querySelectorAll("video.active"));
    newVideo.style.visibility = "visible";

    const playPromise = newVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    // 비디오 첫 프레임 렌더링이 완료되어 active 클래스가 붙는 바로 그 역사적인 순간!
    const activateNewVideo = () => {
      newVideo.classList.add("active");
      
      // [추가] 시간과 텍스트도 비디오 화면이 켜지는 이 순간에 칼같이 같이 바꿉니다!
      if (timeEl && targetTime) timeEl.textContent = targetTime;
      if (textEl && targetText !== undefined) textEl.textContent = targetText;

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

    // 모바일 특화: 첫 프레임이 그려지는 타이밍 감지
    if ("requestVideoFrameCallback" in newVideo) {
      newVideo.requestVideoFrameCallback(() => { activateNewVideo(); });
    } else {
      setTimeout(activateNewVideo, 220);
    }
  },

  getFormattedTime(rawTime) {
    if (window.APP_CORE.state.is24h) return rawTime;

    let [hour, min] = rawTime.split(":").map(Number);
    let displayHour = hour % 12;
    displayHour = displayHour === 0 ? 12 : displayHour;
    const formattedMin = String(min).padStart(2, "0");

    return `${displayHour}:${formattedMin}`;
  },
};

window.APP_UI = APP_UI;
document.addEventListener("DOMContentLoaded", () => APP_UI.init());