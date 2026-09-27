// Navigation and content work without JavaScript. This file adds progressive enhancements.
const sectionLinks = document.querySelectorAll('a[href^="?section="]');
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const openSection = (sectionName) => {
  const section = document.getElementById(sectionName);

  if (!section) {
    return false;
  }

  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", window.location.pathname);
  return true;
};

sectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const url = new URL(link.href, window.location.href);

    if (url.pathname !== window.location.pathname) {
      return;
    }

    const sectionName = url.searchParams.get("section");
    if (sectionName && openSection(sectionName)) {
      event.preventDefault();
    }
  });
});

const requestedSection = new URLSearchParams(window.location.search).get("section");
if (requestedSection) {
  window.requestAnimationFrame(() => openSection(requestedSection));
}

const githubActivity = document.querySelector("[data-github-activity]");

if (githubActivity) {
  fetch("https://github-contributions-api.jogruber.de/v4/ikeermora?y=last")
    .then((response) => {
      if (!response.ok) {
        throw new Error("GitHub contribution data is temporarily unavailable.");
      }
      return response.json();
    })
    .then((data) => {
      const contributions = data.contributions || [];
      if (!contributions.length) {
        throw new Error("No GitHub contribution data was returned.");
      }

      const dateFormatter = new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      });
      const startDate = new Date(`${contributions[0].date}T00:00:00Z`);
      const startOffset = startDate.getUTCDay();
      const weekCount = Math.ceil((contributions.length + startOffset) / 7);
      const total = data.total?.lastYear ?? contributions.reduce((sum, day) => sum + day.count, 0);

      const calendar = document.createElement("div");
      const summary = document.createElement("div");
      const summaryText = document.createElement("p");
      const totalText = document.createElement("strong");
      const rangeText = document.createElement("span");
      const scrollArea = document.createElement("div");
      const layout = document.createElement("div");
      const monthLabels = document.createElement("div");
      const weekdayLabels = document.createElement("div");
      const grid = document.createElement("div");
      const legend = document.createElement("div");

      calendar.className = "contribution-calendar";
      summary.className = "contribution-summary";
      totalText.textContent = total.toLocaleString("en");
      summaryText.append(totalText, " contributions in the last year");
      rangeText.textContent = "Public contributions";
      summary.append(summaryText, rangeText);

      scrollArea.className = "contribution-scroll";
      scrollArea.tabIndex = 0;
      scrollArea.setAttribute("aria-label", "GitHub contribution calendar. Scroll horizontally to see the full year.");
      layout.className = "contribution-layout";
      layout.style.setProperty("--calendar-weeks", weekCount);
      monthLabels.className = "contribution-months";
      weekdayLabels.className = "contribution-weekdays";
      grid.className = "contribution-grid";
      grid.setAttribute("role", "grid");
      grid.setAttribute("aria-label", `${total} GitHub contributions in the last year`);

      ["", "Mon", "", "Wed", "", "Fri", ""].forEach((label) => {
        const dayLabel = document.createElement("span");
        dayLabel.textContent = label;
        weekdayLabels.append(dayLabel);
      });

      for (let index = 0; index < startOffset; index += 1) {
        const spacer = document.createElement("span");
        spacer.className = "contribution-day is-empty";
        spacer.setAttribute("aria-hidden", "true");
        grid.append(spacer);
      }

      contributions.forEach((contribution, index) => {
        const date = new Date(`${contribution.date}T00:00:00Z`);
        const day = document.createElement("span");
        const contributionWord = contribution.count === 1 ? "contribution" : "contributions";

        if (date.getUTCDate() === 1) {
          const month = document.createElement("span");
          month.textContent = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date);
          month.style.gridColumn = String(Math.floor((index + startOffset) / 7) + 1);
          monthLabels.append(month);
        }

        day.className = "contribution-day";
        day.dataset.level = String(contribution.level);
        day.setAttribute("role", "gridcell");
        day.setAttribute("aria-label", `${contribution.count} ${contributionWord} on ${dateFormatter.format(date)}`);
        day.title = `${contribution.count} ${contributionWord} on ${dateFormatter.format(date)}`;
        grid.append(day);
      });

      legend.className = "contribution-legend";
      legend.append("Less");
      for (let level = 0; level <= 4; level += 1) {
        const swatch = document.createElement("span");
        swatch.className = "contribution-day";
        swatch.dataset.level = String(level);
        swatch.setAttribute("aria-hidden", "true");
        legend.append(swatch);
      }
      legend.append("More");

      layout.append(monthLabels, weekdayLabels, grid);
      scrollArea.append(layout);
      calendar.append(summary, scrollArea, legend);
      githubActivity.replaceChildren(calendar);

      if (window.matchMedia("(max-width: 760px)").matches) {
        window.requestAnimationFrame(() => {
          scrollArea.scrollLeft = scrollArea.scrollWidth;
        });
      }

    })
    .catch(() => {
      const status = githubActivity.querySelector(".github-status");
      if (status) status.textContent = "The contribution calendar is temporarily unavailable. View the live profile on GitHub.";
    });
}

// Interactive engineering demonstrations.
const setupSimilarityDemo = (demo) => {
  const xRow = demo.querySelector('[data-bit-row="x"]');
  const wRow = demo.querySelector('[data-bit-row="w"]');
  const thresholdInput = demo.querySelector("[data-threshold]");
  const thresholdValue = demo.querySelector("[data-threshold-value]");
  const matchPattern = demo.querySelector("[data-match-pattern]");
  const matchCount = demo.querySelector("[data-match-count]");
  const output = demo.querySelector("[data-output]");
  const outputNode = demo.querySelector(".output-node");

  if (!xRow || !wRow || !thresholdInput || !thresholdValue || !matchPattern || !matchCount || !output) {
    return;
  }

  const createBitButtons = (row, defaults) => {
    defaults.forEach((value, index) => {
      const button = document.createElement("button");
      button.className = "bit-toggle";
      button.type = "button";
      button.dataset.bit = String(7 - index);
      button.setAttribute("aria-pressed", String(Boolean(value)));
      button.textContent = String(value);
      button.addEventListener("click", () => {
        const nextValue = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(nextValue));
        button.textContent = nextValue ? "1" : "0";
        updateDemo();
      });
      row.appendChild(button);
    });
  };

  const readBits = (row) =>
    [...row.querySelectorAll(".bit-toggle")].map((button) =>
      button.getAttribute("aria-pressed") === "true" ? 1 : 0
    );

  const updateDemo = () => {
    const xBits = readBits(xRow);
    const wBits = readBits(wRow);
    const matches = xBits.map((bit, index) => (bit === wBits[index] ? 1 : 0));
    const count = matches.reduce((sum, bit) => sum + bit, 0);
    const threshold = Number(thresholdInput.value);
    const result = count >= threshold ? 1 : 0;

    thresholdValue.textContent = String(threshold);
    matchPattern.textContent = matches.join("");
    matchCount.textContent = String(count);
    output.textContent = String(result);

    if (outputNode) {
      outputNode.classList.toggle("is-high", Boolean(result));
    }
  };

  createBitButtons(xRow, [1, 0, 1, 1, 0, 0, 1, 0]);
  createBitButtons(wRow, [1, 1, 1, 0, 0, 0, 1, 0]);
  thresholdInput.addEventListener("input", updateDemo);
  updateDemo();
};

document.querySelectorAll('[data-demo="similarity"]').forEach(setupSimilarityDemo);

const setupMipsDemo = (demo) => {
  const instructionNodes = [...demo.querySelectorAll("[data-mips-instruction]")];
  const registerNodes = [...demo.querySelectorAll("[data-mips-register]")];
  const stageNodes = [...demo.querySelectorAll("[data-mips-stage]")];
  const pc = demo.querySelector("[data-mips-pc]");
  const currentInstruction = demo.querySelector("[data-mips-current]");
  const aluOperation = demo.querySelector("[data-mips-alu]");
  const note = demo.querySelector("[data-mips-note]");
  const stepButton = demo.querySelector("[data-mips-step]");
  const resetButton = demo.querySelector("[data-mips-reset]");

  if (!instructionNodes.length || !registerNodes.length || !stageNodes.length || !pc || !currentInstruction || !aluOperation || !note || !stepButton || !resetButton) {
    return;
  }

  const program = [
    { text: "LOAD R1, 5", operation: "Pass immediate", destination: 1, execute: () => 5 },
    { text: "LOAD R2, 3", operation: "Pass immediate", destination: 2, execute: () => 3 },
    { text: "ADD R3, R1, R2", operation: "Add", destination: 3, execute: (registers) => registers[1] + registers[2] },
    { text: "SUB R4, R1, R2", operation: "Subtract", destination: 4, execute: (registers) => registers[1] - registers[2] },
    { text: "AND R5, R1, R2", operation: "Bitwise AND", destination: 5, execute: (registers) => registers[1] & registers[2] },
    { text: "OR R6, R1, R2", operation: "Bitwise OR", destination: 6, execute: (registers) => registers[1] | registers[2] }
  ];
  const stages = ["pc", "instruction", "control", "registers", "alu", "writeback"];
  const stageNotes = {
    pc: "The program counter selects the next instruction.",
    instruction: "The processor reads the current instruction.",
    control: "Control logic selects the required datapath signals.",
    registers: "The register file provides the required operands.",
    alu: "The ALU performs the selected operation.",
    writeback: "The result returns to the destination register."
  };
  let registers;
  let instructionIndex;
  let stageIndex;
  let writtenRegister;

  const render = () => {
    const instruction = program[instructionIndex];
    const complete = instructionIndex >= program.length;

    pc.textContent = complete ? String(program.length) : String(instructionIndex);
    currentInstruction.textContent = complete ? "Program complete" : instruction.text;
    aluOperation.textContent = complete ? "Idle" : instruction.operation;
    note.textContent = complete ? "Program complete. Reset the demo to run it again." : stageNotes[stages[stageIndex]];
    stepButton.textContent = complete ? "Complete" : "Step";
    stepButton.disabled = complete;

    instructionNodes.forEach((node, index) => {
      node.classList.toggle("is-current", index === instructionIndex && !complete);
      node.classList.toggle("is-complete", index < instructionIndex || complete);
    });

    stageNodes.forEach((node) => {
      node.classList.toggle("is-active", !complete && node.dataset.mipsStage === stages[stageIndex]);
    });

    registerNodes.forEach((node, index) => {
      node.textContent = String(registers[index]);
      node.parentElement.classList.toggle("is-written", index === writtenRegister);
    });
  };

  const resetDemo = () => {
    registers = Array(8).fill(0);
    instructionIndex = 0;
    stageIndex = 0;
    writtenRegister = undefined;
    render();
  };

  stepButton.addEventListener("click", () => {
    if (instructionIndex >= program.length) {
      return;
    }

    writtenRegister = undefined;

    if (stages[stageIndex] === "writeback") {
      const instruction = program[instructionIndex];
      registers[instruction.destination] = instruction.execute(registers) & 0xff;
      writtenRegister = instruction.destination;
      instructionIndex += 1;
      stageIndex = 0;
    } else {
      stageIndex += 1;
    }

    render();
  });

  resetButton.addEventListener("click", resetDemo);
  resetDemo();
};

document.querySelectorAll('[data-demo="mips8"]').forEach(setupMipsDemo);

const setupLvdDemo = (demo) => {
  const threshold = 11;
  const slider = demo.querySelector("[data-lvd-slider]");
  const voltageText = demo.querySelector("[data-lvd-voltage]");
  const statusVoltage = demo.querySelector("[data-lvd-status-voltage]");
  const percentText = demo.querySelector("[data-lvd-percent]");
  const fill = demo.querySelector("[data-lvd-fill]");
  const status = demo.querySelector("[data-lvd-status]");
  const explanation = demo.querySelector("[data-lvd-explanation]");
  const startButton = demo.querySelector("[data-lvd-start]");
  const pauseButton = demo.querySelector("[data-lvd-pause]");
  const resetButton = demo.querySelector("[data-lvd-reset]");
  let dischargeTimer;

  if (!slider || !voltageText || !statusVoltage || !percentText || !fill || !status || !explanation) {
    return;
  }

  const setVoltage = (value) => {
    const voltage = Math.max(8, Math.min(13, Number(value)));
    const percentage = Math.round(((voltage - 8) / 5) * 100);
    const connected = voltage >= threshold;
    const formattedVoltage = voltage.toFixed(1);

    slider.value = formattedVoltage;
    voltageText.textContent = formattedVoltage;
    statusVoltage.textContent = formattedVoltage;
    percentText.textContent = `${percentage}%`;
    fill.style.height = `${percentage}%`;
    status.textContent = connected ? "CONNECTED" : "DISCONNECTED";
    explanation.textContent = connected
      ? "The battery remains within its safe operating range. The load stays connected."
      : "The battery has fallen below the protection threshold. The Low Voltage Disconnect isolates the load to prevent over-discharge.";

    demo.classList.toggle("is-connected", connected);
    demo.classList.toggle("is-disconnected", !connected);
  };

  const pauseDischarge = () => {
    window.clearInterval(dischargeTimer);
    dischargeTimer = undefined;
  };

  slider.addEventListener("input", () => {
    pauseDischarge();
    setVoltage(slider.value);
  });

  if (startButton) {
    startButton.addEventListener("click", () => {
      if (dischargeTimer) {
        return;
      }

      dischargeTimer = window.setInterval(() => {
        const nextVoltage = Number(slider.value) - 0.1;
        setVoltage(nextVoltage);

        if (nextVoltage <= 8) {
          pauseDischarge();
        }
      }, 420);
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", pauseDischarge);
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      pauseDischarge();
      setVoltage(12);
    });
  }

  setVoltage(slider.value);
};

document.querySelectorAll('[data-demo="lvd"]').forEach(setupLvdDemo);

const setupCansatDemo = (demo) => {
  const startButton = demo.querySelector("[data-cansat-start]");
  const resetButton = demo.querySelector("[data-cansat-reset]");
  const marker = demo.querySelector("[data-cansat-marker]");
  const phase = demo.querySelector("[data-cansat-phase]");
  const altitude = demo.querySelector("[data-cansat-altitude]");
  const velocity = demo.querySelector("[data-cansat-velocity]");
  const temperature = demo.querySelector("[data-cansat-temperature]");
  const pressure = demo.querySelector("[data-cansat-pressure]");
  const link = demo.querySelector("[data-cansat-link]");
  const packet = demo.querySelector("[data-cansat-packet]");
  let missionTimer;
  let missionTime = 0;

  if (!startButton || !resetButton || !marker || !phase || !altitude || !velocity || !temperature || !pressure || !link || !packet) {
    return;
  }

  const setMissionState = (state) => {
    const pressureValue = 1013.25 * Math.pow(1 - state.altitude / 44330, 5.255);
    const temperatureValue = 24 - state.altitude * 0.0065 + Math.sin(state.time * 0.8) * 0.3;
    const markerPosition = 88 - Math.min(state.altitude, 400) / 400 * 72;

    phase.textContent = state.phase;
    altitude.textContent = Math.round(state.altitude).toString();
    velocity.textContent = state.velocity.toFixed(1);
    temperature.textContent = temperatureValue.toFixed(1);
    pressure.textContent = pressureValue.toFixed(1);
    link.textContent = state.link;
    packet.textContent = state.packet;

    marker.style.setProperty("--cansat-y", `${markerPosition}%`);
    demo.classList.toggle("is-running", state.running);
    demo.classList.toggle("is-descent", state.phase === "Descent");
    demo.classList.toggle("is-complete", state.phase === "Landing / Mission Complete");
  };

  const getMissionState = () => {
    if (missionTime < 0.4) {
      return {
        altitude: 0,
        link: "Standby",
        packet: "--",
        phase: "Idle",
        running: false,
        time: missionTime,
        velocity: 0
      };
    }

    if (missionTime < 7) {
      return {
        altitude: (missionTime / 7) * 315,
        link: "Transmitting",
        packet: `T+${missionTime.toFixed(1)}s`,
        phase: "Drone Ascent",
        running: true,
        time: missionTime,
        velocity: 0
      };
    }

    if (missionTime < 8.5) {
      return {
        altitude: 315,
        link: "Packet lock",
        packet: `T+${missionTime.toFixed(1)}s`,
        phase: "Release",
        running: true,
        time: missionTime,
        velocity: 0
      };
    }

    if (missionTime < 20) {
      const descentProgress = (missionTime - 8.5) / 11.5;
      return {
        altitude: Math.max(0, 315 * (1 - descentProgress)),
        link: "Receiving",
        packet: `T+${missionTime.toFixed(1)}s`,
        phase: "Descent",
        running: true,
        time: missionTime,
        velocity: -(10.8 + Math.sin(missionTime * 1.4) * 0.35)
      };
    }

    return {
      altitude: 0,
      link: "Complete",
      packet: `T+${missionTime.toFixed(1)}s`,
      phase: "Landing / Mission Complete",
      running: false,
      time: missionTime,
      velocity: 0
    };
  };

  const stopMission = () => {
    window.clearInterval(missionTimer);
    missionTimer = undefined;
  };

  const resetMission = () => {
    stopMission();
    missionTime = 0;
    startButton.textContent = "Start Mission Simulation";
    setMissionState(getMissionState());
  };

  startButton.addEventListener("click", () => {
    if (missionTimer) {
      return;
    }

    if (missionTime >= 20) {
      missionTime = 0;
    }

    startButton.textContent = "Simulation Running";
    missionTimer = window.setInterval(() => {
      missionTime += 0.22;
      const state = getMissionState();
      setMissionState(state);

      if (missionTime >= 20) {
        stopMission();
        startButton.textContent = "Run Again";
      }
    }, 180);
  });

  resetButton.addEventListener("click", resetMission);
  resetMission();
};

document.querySelectorAll('[data-demo="cansat"]').forEach(setupCansatDemo);
