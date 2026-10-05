const commands = [
  ["duplicate-tab", "Duplicate active or highlighted tabs", "Alt+Shift+D"],
  ["toggle-pin", "Pin or unpin active or highlighted tabs"],
  ["cycle-previous", "Activate the previous tab", "Alt+Shift+Left"],
  ["cycle-next", "Activate the next tab", "Alt+Shift+Right"],
  ["move-previous", "Move active or highlighted tabs left", "Assign in Chrome"],
  ["move-next", "Move active or highlighted tabs right", "Assign in Chrome"],
  ["highlight-active", "Toggle highlighting for the active tab", "Alt+Shift+Up"],
  ["group-tabs", "Group active or highlighted tabs", "Assign in Chrome"],
  ["new-window", "Move active or highlighted tabs to a new window", "Assign in Chrome"],
  ["move-window-previous", "Move tabs to the previous Chrome window", "Assign in Chrome"],
  ["move-window-next", "Move tabs to the next Chrome window", "Assign in Chrome"]
];

const list = document.querySelector("#commands");
const commandElements = new Map();

for (const [name, label, fallbackShortcut] of commands) {
  const item = document.createElement("li");
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const shortcutElement = document.createElement("kbd");
  shortcutElement.textContent = fallbackShortcut || "Unassigned";
  item.append(labelElement, shortcutElement);
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

document.querySelector("#shortcuts-link").addEventListener("click", (event) => {
  event.preventDefault();
  window.location.href = "chrome://extensions/shortcuts";
});

renderCurrentShortcuts().catch((error) => {
  console.error("Unable to read Chrome shortcut assignments.", error);
});
