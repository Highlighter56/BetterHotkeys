/// <reference types="chrome"/>

import { getSettings, updateSetting } from "../scripts/settings-store.js";

const commands = [
  ["_execute_action",      		"Activate Extention",             "Alt+Shift+M",       "Alt+Shift+M"],
  ["0_focus-chrome",          	"Focus Chrome",                   "Assign in Chrome",  "Global | Alt+Shift+C"],
  ["1_duplicate-tab",         	"Duplicate",                      "Alt+Shift+D",       "Alt+Shift+D"],
  ["2_new-window",            	"Move Tab(s) to New Window",      "Assign in Chrome",  "Alt+Shift+N"],
  ["3_toggle-pin",            	"Pin/Unpin",                      "Assign in Chrome",  "Alt+Shift+X"],
  ["4_group-tabs",            	"Group/Ungroup Tabs",             "Assign in Chrome",  "Alt+Shift+G"],
  ["5_toggle-group-collapse", 	"Expand/Collapse Group",          "Assign in Chrome",  "Alt+Shift+U"],
  ["6_cycle-next",            	"Activate Right",                 "Alt+Period",        "Alt+Period"],
  ["7_cycle-previous",        	"Activate Left",                  "Alt+Comma",         "Alt+Comma"],
  ["8_highlight-right",       	"Highlight Right",                "Assign in Chrome",  "Alt+Shift+Period"],
  ["90_highlight-left",        	"Highlight Left",                 "Assign in Chrome",  "Alt+Shift+Comma"],
  ["91_move-next",             	"Move Tab(s) Right",              "Assign in Chrome",  "Alt+Shift+L"],
  ["92_move-previous",         	"Move Tab(s) Left",               "Assign in Chrome",  "Alt+Shift+K"],
  ["93_move-window-next",      	"Move Tab(s) to Next Window",     "Assign in Chrome",  "Ctrl+Shift+L"],
  ["94_move-window-previous",  	"Move Tab(s) to Previous Window", "Assign in Chrome",  "Ctrl+Shift+K"]
];

const list = document.querySelector("#commands");
const commandElements = new Map();


for (const [name, label, fallbackShortcut, suggested] of commands) {
  const item = document.createElement("li");

  const labelElement = document.createElement("span");
  labelElement.className = "command-label";
  labelElement.textContent = label;

  const shortcutElement = document.createElement("kbd");
  shortcutElement.textContent = fallbackShortcut || "Unassigned";

  const suggestedElement = document.createElement("span");
  suggestedElement.className = "command-suggested";
  suggestedElement.textContent = suggested ? `${suggested}` : "";

  // Append all three directly to the <li> grid container
  item.append(labelElement, shortcutElement, suggestedElement);
  list.append(item);
  commandElements.set(name, shortcutElement);
}


async function renderCurrentShortcuts() {
  const assignments = await chrome.commands.getAll();
  for (const assignment of assignments) {
    const element = commandElements.get(assignment.name);
    if (element) {
      element.textContent = assignment.shortcut || "Unassigned";
    }
  }
}

renderCurrentShortcuts().catch((error) => {
  console.error("Unable to read Chrome shortcut assignments.", error);
});


const configureButton = document.querySelector("#configure-btn");
if (configureButton) {
  configureButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }).catch((error) => {
      console.error("Failed to open shortcuts page:", error);
    });
  });
}

const settingControls = new Map([
  ["showGroupCustomization", document.querySelector("#show-group-customization")],
  ["confirmUngroup", document.querySelector("#confirm-ungroup")],
  ["displayRecommendedCommands", document.querySelector("#display-recommended-commands")]
]);
const settingsStatus = document.querySelector("#settings-status");

function updateRecommendedCommandsVisibility(isVisible) {
  list.classList.toggle("hide-recommendations", !isVisible);
}

async function loadSettings() {
  const settings = await getSettings();
  for (const [name, control] of settingControls) {
    if (control) {
      control.checked = settings[name];
    }
  }
  updateRecommendedCommandsVisibility(settings.displayRecommendedCommands);
}

for (const [name, control] of settingControls) {
  if (!control) {
    continue;
  }

  control.addEventListener("change", async () => {
    control.disabled = true;
    settingsStatus.textContent = "";
    try {
      await updateSetting(name, control.checked);
      if (name === "displayRecommendedCommands") {
        updateRecommendedCommandsVisibility(control.checked);
      }
      settingsStatus.textContent = "Settings saved.";
    } catch (error) {
      control.checked = !control.checked;
      settingsStatus.textContent = `Unable to save settings: ${error.message}`;
      console.error("Unable to save Better Hotkeys settings.", error);
    } finally {
      control.disabled = false;
    }
  });
}

loadSettings().catch((error) => {
  settingsStatus.textContent = `Unable to load settings: ${error.message}`;
  console.error("Unable to load Better Hotkeys settings.", error);
});