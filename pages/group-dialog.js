const groupId = Number(new URLSearchParams(window.location.search).get("groupId"));
const form = document.querySelector("#group-form");
const titleInput = document.querySelector("#group-title");
const colorInput = document.querySelector("#group-color");
const status = document.querySelector("#status");

async function loadGroup() {
  if (!Number.isInteger(groupId)) {
    throw new Error("The group ID is missing or invalid.");
  }
  const group = await chrome.tabGroups.get(groupId);
  titleInput.value = group.title || "";
  colorInput.value = group.color;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await chrome.tabGroups.update(groupId, {
      title: titleInput.value.trim(),
      color: colorInput.value
    });
    window.close();
  } catch (error) {
    status.textContent = `Unable to update the group: ${error.message}`;
  }
});

document.querySelector("#cancel").addEventListener("click", () => {
  window.close();
});

loadGroup().catch((error) => {
  status.textContent = error.message;
});
