/// <reference types="chrome"/>

const DEFAULT_SETTINGS = Object.freeze({
  showGroupCustomization: false,
  confirmUngroup: false
});

export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return {
    showGroupCustomization:
      typeof stored.showGroupCustomization === "boolean"
        ? stored.showGroupCustomization
        : DEFAULT_SETTINGS.showGroupCustomization,
    confirmUngroup:
      typeof stored.confirmUngroup === "boolean"
        ? stored.confirmUngroup
        : DEFAULT_SETTINGS.confirmUngroup
  };
}

export async function updateSetting(name, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, name)) {
    throw new TypeError(`Unknown Better Hotkeys setting: ${name}`);
  }
  if (typeof value !== "boolean") {
    throw new TypeError(`Better Hotkeys setting ${name} must be a boolean.`);
  }

  await chrome.storage.local.set({ [name]: value });
}
