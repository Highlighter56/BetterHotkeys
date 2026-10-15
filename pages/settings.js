const commands = [
  ["_execute_action", "Activate Extension", "Unavailable", "Alt+Shift+B"],
  ["duplicate-tab", "Duplicate", "Alt+Shift+D", "Alt+Shift+D"],
  ["toggle-pin", "Pin/Unpin", "Assign in Chrome", "Alt+Shift+X"],
  ["group-tabs", "Group/Ungroup Tabs", "Assign in Chrome", "Alt+Shift+G"],
  ["highlight-right", "Highlight Right", "Assign in Chrome", "Alt+L"],
  ["highlight-left", "Highlight Left", "Assign in Chrome", "Alt+K"],
  ["cycle-next", "Activate Right", "Alt+Shift+Right", "Alt+Period"],
  ["cycle-previous", "Activate Left", "Alt+Shift+Left", "Alt+Comma"],
  ["move-next", "Move Tab(s) Right", "Assign in Chrome", "Alt+Shift+Period"],
  ["move-previous", "Move Tab(s) Left", "Assign in Chrome", "Alt+Shift+Comma"],
  ["new-window", "Move Tab(s) to New Window", "Assign in Chrome", "Alt+N"],
  ["move-window-next", "Move Tab(s) to Next Window", "Assign in Chrome", "Ctrl+Shift+Period"],
  ["move-window-previous", "Move Tab(s) to Previous Window", "Assign in Chrome", "Ctrl+Shift+Comma"]
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
