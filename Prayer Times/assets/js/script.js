const API_URL = "https://api.aladhan.com/v1";

const LOCATION = {
  name: "Baku, Azerbaijan",
  latitude: 40.4093,
  longitude: 49.8671,
  method: 2
};

const PRAYERS = [
  { key: "Fajr", name: "Fajr", icon: "☾" },
  { key: "Dhuhr", name: "Dhuhr", icon: "☀" },
  { key: "Asr", name: "Asr", icon: "◒" },
  { key: "Maghrib", name: "Maghrib", icon: "◔" },
  { key: "Isha", name: "Isha", icon: "☽" }
];


const elements = {
  selectedDate: document.getElementById("selectedDate"),
  hijriDate: document.getElementById("hijriDate"),
  datePicker: document.getElementById("datePicker"),
  monthPicker: document.getElementById("monthPicker"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  todayButton: document.getElementById("todayButton"),

  nextPrayerName: document.getElementById("nextPrayerName"),
  nextPrayerDescription: document.getElementById("nextPrayerDescription"),
  countdown: document.getElementById("countdown"),
  countdownNote: document.getElementById("countdownNote"),
  progressFill: document.getElementById("progressFill"),

  prayerGrid: document.getElementById("prayerGrid"),
  statusMessage: document.getElementById("statusMessage"),

  calendarMonthTitle: document.getElementById("calendarMonthTitle"),
  calendarDays: document.getElementById("calendarDays"),
  calendarPrev: document.getElementById("calendarPrev"),
  calendarNext: document.getElementById("calendarNext"),

  menuButton: document.getElementById("menuButton"),
  navigation: document.getElementById("navigation"),

  prayerModal: document.getElementById("prayerModal"),
  closePrayerModal: document.getElementById("closePrayerModal"),
  modalDone: document.getElementById("modalDone"),
  modalDate: document.getElementById("modalDate"),
  modalHijri: document.getElementById("modalHijri"),
  modalPrayerTimes: document.getElementById("modalPrayerTimes")
};



let monthData = [];
let selectedDate = localISODate(new Date());
let displayedMonth = firstDayOfMonth(new Date());
let requestNumber = 0;
let countdownInterval = null;
let lastFocusedElement = null;



function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatHumanDate(iso) {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function monthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getApiISODate(day) {
  const date = day.date.gregorian.date;
  const [dd, mm, yyyy] = date.split("-");

  return `${yyyy}-${mm}-${dd}`;
}

function getDayData(iso) {
  return monthData.find((day) => getApiISODate(day) === iso);
}

function cleanTime(value) {
  if (!value) return "--:--";
 
  return String(value).split(" ")[0].slice(0, 5);
}

function getHijriText(day) {
  if (!day?.date?.hijri) return "";

  const hijri = day.date.hijri;

  return `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

 

async function loadMonth(year, month) {
  const thisRequest = ++requestNumber;

  elements.statusMessage.textContent = "Loading prayer times...";
  elements.calendarDays.innerHTML =
    '<p class="loading">Loading calendar...</p>';

  const url =
    `${API_URL}/calendar/${year}/${month}` +
    `?latitude=${LOCATION.latitude}` +
    `&longitude=${LOCATION.longitude}` +
    `&method=${LOCATION.method}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load prayer times.");
    }

    const result = await response.json();

    if (
      result.code !== 200 ||
      !Array.isArray(result.data) ||
      result.data.length === 0
    ) {
      throw new Error("The API returned no prayer times.");
    }

 
    if (thisRequest !== requestNumber) return;

    monthData = result.data;
    displayedMonth = new Date(year, month - 1, 1);

    elements.calendarMonthTitle.textContent =
      displayedMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      });

    renderCalendar();
    renderSelectedDate();

    elements.statusMessage.textContent =
      `Prayer times loaded for ${LOCATION.name}.`;

  } catch (error) {
    if (thisRequest !== requestNumber) return;

    console.error("Prayer times error:", error);

    elements.statusMessage.textContent =
      "Unable to load prayer times. Check your internet connection and try again.";

    elements.calendarDays.innerHTML =
      '<p class="loading">Calendar could not be loaded. Please try again.</p>';

    elements.prayerGrid.innerHTML =
      '<p class="loading">Prayer times could not be loaded.</p>';

    elements.hijriDate.textContent = "";
    resetCountdown("Prayer times unavailable");
  }
}

 

function renderPrayerCards(day) {
  if (!day) {
    elements.prayerGrid.innerHTML =
      '<p class="loading">No prayer times found for this date.</p>';
    return;
  }

  elements.prayerGrid.innerHTML = PRAYERS.map((prayer) => {
    const time = cleanTime(day.timings[prayer.key]);

    return `
      <article class="prayer-card">
        <div class="prayer-icon">${prayer.icon}</div>
        <div class="prayer-name">${prayer.name}</div>
        <div class="prayer-time">${time}</div>
      </article>
    `;
  }).join("");
}

 
function renderSelectedDate() {
  const day = getDayData(selectedDate);

  elements.selectedDate.textContent = formatHumanDate(selectedDate);
  elements.datePicker.value = selectedDate;
  elements.monthPicker.value = monthKey(displayedMonth);

  if (!day) {
    elements.hijriDate.textContent = "Islamic date unavailable";
    elements.prayerGrid.innerHTML =
      '<p class="loading">No prayer times found for this date.</p>';

    resetCountdown("Prayer times unavailable");
    return;
  }

  elements.hijriDate.textContent = getHijriText(day);

 
  renderPrayerCards(day);

 
  updateCountdown();
}
 

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();

 
  const mondayOffset = (firstWeekday + 6) % 7;

  let html = "";

 
  for (let i = 0; i < mondayOffset; i++) {
    html += '<div class="day-cell outside" aria-hidden="true"></div>';
  }

  monthData.forEach((day) => {
    const iso = getApiISODate(day);
    const gregorian = day.date.gregorian;
    const hijri = day.date.hijri;

    const isToday = iso === localISODate(new Date());
    const isSelected = iso === selectedDate;

    const classes = [
      "day-cell",
      isToday ? "today" : "",
      isSelected ? "selected" : ""
    ].filter(Boolean).join(" ");

    const hijriLabel = `${hijri.day} ${hijri.month.en}`;

    const prayerRows = PRAYERS.map((prayer) => {
      const time = cleanTime(day.timings[prayer.key]);

      return `
        <span class="day-prayer">
          <b>${prayer.name}</b>
          <span>${time}</span>
        </span>
      `;
    }).join("");

    html += `
      <button
        type="button"
        class="${classes}"
        data-date="${iso}"
        aria-label="${escapeHTML(formatHumanDate(iso))}, prayer times"
        aria-pressed="${isSelected}"
      >
        <span class="day-number">${Number(gregorian.day)}</span>
        <span class="day-hijri">${escapeHTML(hijriLabel)}</span>
        <span class="day-prayer-times">${prayerRows}</span>
      </button>
    `;
  });

  elements.calendarDays.innerHTML = html;
}

 

function openPrayerModal(iso) {
  const day = getDayData(iso);

  if (!day) {
    elements.statusMessage.textContent =
      "Prayer times for this date are not available yet.";
    return;
  }

  lastFocusedElement = document.activeElement;

  elements.modalDate.textContent = formatHumanDate(iso);
  elements.modalHijri.textContent = getHijriText(day);

 
  elements.modalPrayerTimes.innerHTML = PRAYERS.map((prayer) => {
    const time = cleanTime(day.timings[prayer.key]);

    return `
      <div class="modal-prayer-row">
        <div class="modal-prayer-name">
          <span class="modal-prayer-icon">${prayer.icon}</span>
          <span>${prayer.name}</span>
        </div>
        <span class="modal-prayer-time">${time}</span>
      </div>
    `;
  }).join("");

  elements.prayerModal.classList.add("active");
  elements.prayerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  elements.closePrayerModal.focus();
}

function closePrayerModal() {
  elements.prayerModal.classList.remove("active");
  elements.prayerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

 
elements.calendarDays.addEventListener("click", async (event) => {
  const dayCell = event.target.closest(".day-cell[data-date]");

  if (!dayCell) return;

  const iso = dayCell.dataset.date;
  await selectDate(iso);
  openPrayerModal(iso);
});

elements.closePrayerModal.addEventListener("click", closePrayerModal);
elements.modalDone.addEventListener("click", closePrayerModal);

elements.prayerModal.addEventListener("click", (event) => {
  if (event.target === elements.prayerModal) {
    closePrayerModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    elements.prayerModal.classList.contains("active")
  ) {
    closePrayerModal();
  }
});

 

async function selectDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;

  const date = parseISODate(iso);

  if (localISODate(date) !== iso) return;

  selectedDate = iso;
  displayedMonth = firstDayOfMonth(date);

  elements.datePicker.value = selectedDate;
  elements.monthPicker.value = monthKey(displayedMonth);

  const targetMonth = monthKey(displayedMonth);
  const currentlyLoadedMonth = monthData.length
    ? monthKey(parseISODate(getApiISODate(monthData[0])))
    : "";

  if (targetMonth !== currentlyLoadedMonth) {
    await loadMonth(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1
    );
  } else {
    renderCalendar();
    renderSelectedDate();
  }
}

elements.datePicker.addEventListener("change", (event) => {
  if (event.target.value) {
    selectDate(event.target.value);
  }
});

elements.monthPicker.addEventListener("change", (event) => {
  if (!event.target.value) return;

  const [year, month] = event.target.value.split("-").map(Number);

 
  const selectedDay = parseISODate(selectedDate).getDate();
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(selectedDay, lastDay);

  selectDate(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );
});

elements.todayButton.addEventListener("click", () => {
  selectDate(localISODate(new Date()));
});

 

async function changeMonth(offset) {
  const targetMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + offset,
    1
  );

  
  const selectedDay = parseISODate(selectedDate).getDate();
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  ).getDate();

  const day = Math.min(selectedDay, lastDay);

  const iso =
    `${targetMonth.getFullYear()}-` +
    `${String(targetMonth.getMonth() + 1).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`;

  await selectDate(iso);
}

elements.prevMonth.addEventListener("click", () => changeMonth(-1));
elements.nextMonth.addEventListener("click", () => changeMonth(1));
elements.calendarPrev.addEventListener("click", () => changeMonth(-1));
elements.calendarNext.addEventListener("click", () => changeMonth(1));
 

function resetCountdown(message) {
  elements.nextPrayerName.textContent = "Prayer schedule";
  elements.nextPrayerDescription.textContent = message;
  elements.countdown.textContent = "--:--:--";
  elements.countdownNote.textContent = message;
  elements.progressFill.style.width = "0%";
}

function updateCountdown() {
  const today = localISODate(new Date());

  if (selectedDate !== today) {
    elements.nextPrayerName.textContent = "Selected date";
    elements.nextPrayerDescription.textContent =
      "You are viewing another date's prayer schedule.";

    elements.countdown.textContent = "--:--:--";
    elements.countdownNote.textContent =
      "Countdown is available for today's prayers.";

    elements.progressFill.style.width = "0%";
    return;
  }

  const day = getDayData(today);

  if (!day) {
    resetCountdown("Prayer times unavailable");
    return;
  }

  const now = new Date();

  const prayerTimes = PRAYERS.map((prayer) => {
    const time = cleanTime(day.timings[prayer.key]);
    const [hours, minutes] = time.split(":").map(Number);

    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    return {
      ...prayer,
      time,
      target
    };
  });

  let nextIndex = prayerTimes.findIndex(
    (prayer) => prayer.target.getTime() > now.getTime()
  );

  let nextPrayer;
  let previousPrayer;
  let nextTarget;

  if (nextIndex === -1) {
 
    nextPrayer = prayerTimes[0];
    previousPrayer = prayerTimes[prayerTimes.length - 1];

    nextTarget = new Date(prayerTimes[0].target);
    nextTarget.setDate(nextTarget.getDate() + 1);
  } else {
    nextPrayer = prayerTimes[nextIndex];

    previousPrayer =
      nextIndex === 0
        ? prayerTimes[prayerTimes.length - 1]
        : prayerTimes[nextIndex - 1];

    nextTarget = nextPrayer.target;

    if (nextIndex === 0) {
      const yesterday = new Date(previousPrayer.target);
      yesterday.setDate(yesterday.getDate() - 1);
      previousPrayer = {
        ...previousPrayer,
        target: yesterday
      };
    }
  }

  const remaining = Math.max(0, nextTarget.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  elements.nextPrayerName.textContent = nextPrayer.name;
  elements.nextPrayerDescription.textContent =
    `Next prayer: ${nextPrayer.name} at ${nextPrayer.time}`;

  elements.countdown.textContent = `${hours}:${minutes}:${seconds}`;
  elements.countdownNote.textContent = "Time remaining until the next prayer";

  const fullInterval =
    nextTarget.getTime() - previousPrayer.target.getTime();

  const elapsed = now.getTime() - previousPrayer.target.getTime();

  const progress = fullInterval > 0
    ? Math.min(100, Math.max(0, (elapsed / fullInterval) * 100))
    : 0;

  elements.progressFill.style.width = `${progress}%`;
}

 

elements.menuButton.addEventListener("click", () => {
  const isOpen = elements.navigation.classList.toggle("open");

  elements.menuButton.setAttribute("aria-expanded", String(isOpen));
  elements.menuButton.setAttribute(
    "aria-label",
    isOpen ? "Close menu" : "Open menu"
  );
});

elements.navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    elements.navigation.classList.remove("open");
    elements.menuButton.setAttribute("aria-expanded", "false");
    elements.menuButton.setAttribute("aria-label", "Open menu");
  });
});

 

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();

  elements.datePicker.value = selectedDate;
  elements.monthPicker.value = monthKey(displayedMonth);

  await loadMonth(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + 1
  );

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = setInterval(updateCountdown, 1000);
}

init();
