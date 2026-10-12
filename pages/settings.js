const commands = [
  ["_execute_action", "Activate Extension", "Unavailable"],
  ["duplicate-tab", "Duplicate", "Alt+Shift+D"],
  ["toggle-pin", "Pin/Unpin", "Assign in Chrome"],
  ["group-tabs", "Group/Ungroup Tabs", "Assign in Chrome"],
  ["highlight-right", "Highlight Right", "Assign in Chrome"],
  ["highlight-left", "Highlight Left", "Assign in Chrome"],
  ["cycle-next", "Activate Right", "Alt+Shift+Right"],
  ["cycle-previous", "Activate Left", "Alt+Shift+Left"],
  ["move-next", "Move Tab(s) Right", "Assign in Chrome"],
  ["move-previous", "Move Tab(s) Left", "Assign in Chrome"],
  ["new-window", "Move Tab(s) to New Window", "Assign in Chrome"],
  ["move-window-next", "Move Tab(s) to Next Window", "Assign in Chrome"],
  ["move-window-previous", "Move Tab(s) to Previous Window", "Assign in Chrome"]
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
  window.location.href = "https://my.newpaltz.edu/";
});

renderCurrentShortcuts().catch((error) => {
  console.error("Unable to read Chrome shortcut assignments.", error);
});
