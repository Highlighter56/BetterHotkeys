/// <reference types="chrome"/>

const params = new URLSearchParams(window.location.search);
const groupIdValue = params.get("groupId");
const groupId = groupIdValue === null ? NaN : Number(groupIdValue);
const mode = params.get("mode") || "customize";
const groupForm = document.querySelector("#group-form");
const titleInput = document.querySelector("#group-title");
const ungroupPanel = document.querySelector("#ungroup-panel");
const ungroupForm = document.querySelector("#ungroup-form");
const ungroupDescription = document.querySelector("#ungroup-description");
const confirmUngroupButton = document.querySelector("#confirm-ungroup");
const status = document.querySelector("#status");
let isSubmitting = false;

async function loadGroup() {
  if (!Number.isInteger(groupId)) {
    throw new Error("The group ID is missing or invalid.");
  }

  if (mode === "customize") {
    const group = await chrome.tabGroups.get(groupId);
    titleInput.value = group.title || "";
    const selectedColor = groupForm.querySelector(
      `input[name="color"][value="${group.color}"]`
    );
    if (selectedColor) {
      selectedColor.checked = true;
    }

    titleInput.focus();
    titleInput.select();
    return;
  }

  if (mode === "ungroup") {
    const group = await chrome.tabGroups.get(groupId);
    const tabs = await chrome.tabs.query({ groupId });
    const title = group.title ? `"${group.title}"` : "this group";
    ungroupDescription.textContent =
      `Ungroup ${title} and its ${tabs.length} tabs? Their order will stay the same.`;
    groupForm.hidden = true;
    ungroupPanel.hidden = false;
    confirmUngroupButton.focus();
    return;
  }

  throw new Error("The requested group dialog mode is not supported.");
}

async function saveGroup() {
  if (isSubmitting) {
    return;
  }
  isSubmitting = true;
  status.textContent = "";

  try {
    const selectedColor = groupForm.querySelector(
      'input[name="color"]:checked'
    );
    if (!selectedColor) {
      throw new Error("Select a group color.");
    }

    await chrome.tabGroups.update(groupId, {
      title: titleInput.value.trim(),
      color: selectedColor.value
    });
    window.close();
  } catch (error) {
    status.textContent = `Unable to update the group: ${error.message}`;
    isSubmitting = false;
  }
}

async function ungroup() {
  if (isSubmitting) {
    return;
  }
  isSubmitting = true;
  status.textContent = "";

  try {
    const tabs = await chrome.tabs.query({ groupId });
    if (tabs.length === 0) {
      throw new Error("This group no longer exists.");
    }

    await chrome.tabs.ungroup(tabs.map((tab) => tab.id));
    window.close();
  } catch (error) {
    status.textContent = `Unable to ungroup: ${error.message}`;
    isSubmitting = false;
  }
}

groupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveGroup();
});

ungroupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void ungroup();
});

document.querySelector("#cancel-ungroup").addEventListener("click", () => {
  window.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    window.close();
    return;
  }

  if (event.key !== "Enter" || event.isComposing || event.repeat) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (mode === "ungroup") {
    confirmUngroupButton.click();
  } else {
    void saveGroup();
  }
}, true);

loadGroup().catch((error) => {
  status.textContent = error.message;
});
