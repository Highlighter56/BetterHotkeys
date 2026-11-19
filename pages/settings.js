/// <reference types="chrome"/>

import { getSettings, updateSetting } from "../scripts/settings-store.js";

const recommendedShortcuts = {
  "0_display-popup": 			"Alt+Shift+M",
  "1_focus-chrome": 			"GLOBAL | Alt+Shift+C",
  "2_duplicate-tab": 			"Alt+Shift+D",
  "3_new-window": 				"Alt+Shift+N",
  "4_toggle-pin": 				"Alt+Shift+X",
  "5_group-tabs": 				"Alt+Shift+G",
  "6_toggle-group-collapse": 	"Alt+Shift+U",
  "7_cycle-next": 				"Alt+Period",
  "8_cycle-previous": 			"Alt+Comma",
  "90_highlight-right": 		"Alt+Shift+Period",
  "91_highlight-left": 			"Alt+Shift+Comma",
  "92_move-next": 				"Alt+Shift+L",
  "93_move-previous": 			"Alt+Shift+K",
  "94_move-window-next": 		"Ctrl+Shift+L",
  "95_move-window-previous": 	"Ctrl+Shift+K"
};

const manifestCommands = chrome.runtime.getManifest().commands || {};
const commands = Object.entries(manifestCommands)
  .filter(([name]) => name !== "_execute_action")
  .sort(([leftName], [rightName]) => (
    Number(leftName.split("_", 1)[0]) - Number(rightName.split("_", 1)[0])
  ))
  .map(([name, command]) => {
    const suggestedShortcut = typeof command.suggested_key === "string"
      ? command.suggested_key
      : command.suggested_key?.default;
    return [
      name,
      command.description,
      suggestedShortcut || "Assign in Chrome",
      recommendedShortcuts[name] || ""
    ];
  });

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
  suggestedElement.textContent = suggested || "";

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
