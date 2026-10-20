/**
 * Better Hotkeys - Background Service Worker
 */

const DEFAULT_QUERY = {
  active: true,
  currentWindow: true,
  windowType: "normal"
};

const WINDOW_FOCUS_DEBOUNCE_MS = 75;

let chromeWindowQueue = [];
let chromeHasFocus = false;
let isProgrammaticFocus = false;
let focusLossTimer = null;
let programmaticFocusTimer = null;
let windowQueueReady;

/* =================================v=========================
 * UTILITY HELPERS
 * ========================================================== */

function removeWindowFromQueue(windowId) {
  chromeWindowQueue = chromeWindowQueue.filter((id) => id !== windowId);
}

function addWindowToQueue(windowId, toFront = true) {
  removeWindowFromQueue(windowId);
  if (toFront) {
    chromeWindowQueue.unshift(windowId);
  } else {
    chromeWindowQueue.push(windowId);
  }
}

async function initializeWindowQueue() {
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  const focusedWindow = windows.find((window) => window.focused);
  const remainingWindows = windows
    .filter((window) => window.id !== focusedWindow?.id)
    .sort((left, right) => left.id - right.id);

  chromeWindowQueue = [
    ...(focusedWindow ? [focusedWindow.id] : []),
    ...remainingWindows.map((window) => window.id)
  ];
  chromeHasFocus = Boolean(focusedWindow);
}

function ensureWindowQueueReady() {
  if (!windowQueueReady) {
    windowQueueReady = initializeWindowQueue().catch((error) => {
      windowQueueReady = null;
      console.error("Better Hotkeys failed to initialize Chrome windows", error);
      throw error;
    });
  }
  return windowQueueReady;
}

async function pruneWindowQueue() {
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  const validIds = new Set(windows.map((window) => window.id));
  chromeWindowQueue = chromeWindowQueue.filter((id) => validIds.has(id));

  for (const window of windows) {
    if (!chromeWindowQueue.includes(window.id)) {
      chromeWindowQueue.push(window.id);
    }
  }

  const focusedWindow = windows.find((window) => window.focused);
  chromeHasFocus = Boolean(focusedWindow);
  return windows;
}

function clearProgrammaticFocusGuard() {
  isProgrammaticFocus = false;
  if (programmaticFocusTimer !== null) {
    clearTimeout(programmaticFocusTimer);
    programmaticFocusTimer = null;
  }
}

function setProgrammaticFocusGuard() {
  isProgrammaticFocus = true;
  if (programmaticFocusTimer !== null) {
    clearTimeout(programmaticFocusTimer);
  }
  programmaticFocusTimer = setTimeout(() => {
    programmaticFocusTimer = null;
    isProgrammaticFocus = false;
  }, WINDOW_FOCUS_DEBOUNCE_MS * 4);
}

async function focusQueuedWindow(windowId) {
  setProgrammaticFocusGuard();
  try {
    await chrome.windows.update(windowId, { focused: true, state: "normal" });
    chromeHasFocus = true;
    return true;
  } catch (error) {
    removeWindowFromQueue(windowId);
    clearProgrammaticFocusGuard();
    console.warn(`Better Hotkeys could not focus Chrome window ${windowId}`, error);
    return false;
  }
}

async function focusChrome() {
  await ensureWindowQueueReady();
  let windows = await pruneWindowQueue();

  while (chromeWindowQueue.length > 0) {
    const focusedWindow = windows.find((window) => window.focused);
    const targetId = focusedWindow && chromeHasFocus
      ? (() => {
          addWindowToQueue(focusedWindow.id, false);
          return chromeWindowQueue[0];
        })()
      : chromeWindowQueue[0];

    if (targetId === undefined) {
      return;
    }

    const focused = await focusQueuedWindow(targetId);
    if (focused) {
      removeWindowFromQueue(targetId);
      chromeWindowQueue.push(targetId);
      return;
    }

    windows = await pruneWindowQueue();
  }
}

ensureWindowQueueReady().catch(() => {
  // The command handler reports subsequent command failures.
});

chrome.windows.onCreated.addListener((window) => {
  if (window.type === "normal") {
    addWindowToQueue(window.id);
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  removeWindowFromQueue(windowId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (focusLossTimer !== null) {
    clearTimeout(focusLossTimer);
    focusLossTimer = null;
  }

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    focusLossTimer = setTimeout(async () => {
      focusLossTimer = null;
      try {
        const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
        chromeHasFocus = windows.some((window) => window.focused);
      } catch (error) {
        console.error("Better Hotkeys failed to check Chrome focus", error);
      }
    }, WINDOW_FOCUS_DEBOUNCE_MS);
    return;
  }

  chromeHasFocus = true;
  if (isProgrammaticFocus) {
    clearProgrammaticFocusGuard();
    return;
  }

  try {
    const window = await chrome.windows.get(windowId);
    if (window.type === "normal") {
      addWindowToQueue(windowId);
    }
  } catch (error) {
    console.error(`Better Hotkeys failed to inspect focused window ${windowId}`, error);
  }
});

async function getActiveTab() {
  const tabs = await chrome.tabs.query(DEFAULT_QUERY);
  return tabs[0] || null;
}

async function getOperationTabs() {
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return [];
  }

  const highlightedTabs = await chrome.tabs.query({
    highlighted: true,
    windowId: activeTab.windowId
  });

  return highlightedTabs.length > 0 ? highlightedTabs : [activeTab];
}

function sortTabs(tabs) {
  return [...tabs].sort((left, right) => left.index - right.index);
}


/* ==========================================================
 * TAB ACTION HANDLERS (Duplicate, Pin, Group)
 * ========================================================== */

async function duplicateTabs() {
  const tabs = sortTabs(await getOperationTabs());
  for (const tab of tabs) {
    await chrome.tabs.duplicate(tab.id);
  }
}

async function togglePin() {
  const tabs = await getOperationTabs();
  if (tabs.length === 0) {
    return;
  }

  const shouldPin = tabs.some((tab) => !tab.pinned);
  for (const tab of tabs) {
    await chrome.tabs.update(tab.id, { pinned: shouldPin });
  }
}

async function groupTabs() {
  const tabs = await getOperationTabs();
  if (tabs.length === 0) {
    return;
  }

  const groupId = await chrome.tabs.group({
    tabIds: tabs.map((tab) => tab.id)
  });
  await chrome.windows.create({
    url: `${chrome.runtime.getURL("pages/group-dialog.html")}?groupId=${encodeURIComponent(groupId)}`,
    type: "popup",
    focused: true,
    width: 360,
    height: 320
  });
}


/* ==========================================================
 * NAVIGATION & SELECTION HANDLERS (Cycling & Highlighting)
 * ========================================================== */

async function cycleTab(direction) {
  const activeTab = await getActiveTab();
  if (!activeTab || activeTab.index < 0) {
    return;
  }

  const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  if (tabs.length < 2) {
    return;
  }

  const nextIndex = (activeTab.index + direction + tabs.length) % tabs.length;
  const targetId = tabs[nextIndex].id;

  await chrome.tabs.update(targetId, { active: true });
}

async function highlightAdjacentTab(direction) {
  const activeTab = await getActiveTab();
  if (!activeTab || activeTab.index < 0) return;

  const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  if (tabs.length < 2) return;

  const nextIndex = activeTab.index + direction;
  if (nextIndex < 0 || nextIndex >= tabs.length) {
    return;
  }

  const targetTab = tabs[nextIndex];
  const highlightedIds = new Set(
    tabs.filter((t) => t.highlighted).map((t) => t.id)
  );

  if (highlightedIds.has(targetTab.id)) {
    highlightedIds.delete(activeTab.id);
  } else {
    highlightedIds.add(activeTab.id);
    highlightedIds.add(targetTab.id);
  }

  await highlightTabsAndActivate(
    activeTab.windowId,
    [...highlightedIds],
    targetTab.id
  );
}

async function highlightTabsAndActivate(windowId, tabIds, activeTabId) {
  const tabs = await chrome.tabs.query({ windowId });
  const selectedIds = new Set(tabIds);

  const selectedTabs = tabs.filter((tab) => selectedIds.has(tab.id));
  const activeTab = selectedTabs.find((tab) => tab.id === activeTabId);

  if (!activeTab || selectedTabs.length === 0) return;

  const indexes = [
    activeTab.index,
    ...selectedTabs.filter((t) => t.id !== activeTabId).map((t) => t.index)
  ];

  await chrome.tabs.highlight({
    windowId,
    tabs: indexes
  });
}


/* ==========================================================
 * WINDOW & MOVEMENT HANDLERS
 * ========================================================== */

async function moveTabs(direction) {
  const tabs = sortTabs(await getOperationTabs());
  if (tabs.length === 0) {
    return;
  }

  if (direction < 0) {
    for (const tab of tabs) {
      const current = await chrome.tabs.get(tab.id);
      if (current.index > 0) {
        await chrome.tabs.move(current.id, { index: current.index - 1 });
      }
    }
    return;
  }

  for (const tab of [...tabs].reverse()) {
    const current = await chrome.tabs.get(tab.id);
    const windowTabs = await chrome.tabs.query({ windowId: current.windowId });
    if (current.index < windowTabs.length - 1) {
      await chrome.tabs.move(current.id, { index: current.index + 1 });
    }
  }
}

async function moveTabsToNewWindow() {
  const tabs = await getOperationTabs();
  if (tabs.length === 0) {
    return;
  }

  const newWindow = await chrome.windows.create({ tabId: tabs[0].id });
  if (tabs.length > 1) {
    await chrome.tabs.move(
      tabs.slice(1).map((tab) => tab.id),
      { windowId: newWindow.id, index: -1 }
    );
  }
  await highlightTabsAndActivate(
    newWindow.id,
    tabs.map((tab) => tab.id),
    tabs[0].id
  );
  await chrome.windows.update(newWindow.id, { focused: true });
}

async function moveTabsBetweenWindows(direction) {
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return;
  }

  const windows = (await chrome.windows.getAll({ windowTypes: ["normal"] }))
    .sort((left, right) => left.id - right.id);
  if (windows.length < 2) {
    return;
  }
  const currentIndex = windows.findIndex((window) => window.id === activeTab.windowId);
  if (currentIndex < 0) {
    return;
  }

  const targetIndex =
    (currentIndex + direction + windows.length) % windows.length;
  const targetWindow = windows[targetIndex];

  const tabs = await getOperationTabs();
  await chrome.tabs.move(
    tabs.map((tab) => tab.id),
    { windowId: targetWindow.id, index: -1 }
  );
  const movedTabIds = tabs.map((tab) => tab.id);
  await highlightTabsAndActivate(targetWindow.id, movedTabIds, tabs[0].id);
  await chrome.windows.update(targetWindow.id, { focused: true });
}


/* ==========================================================
 * COMMAND ROUTING & EVENT LISTENER
 * ========================================================== */

// Map manifest command names to their respective handler functions
const commandHandlers = {
  "focus-chrome": focusChrome,
  "duplicate-tab": duplicateTabs,
  "toggle-pin": togglePin,
  "cycle-previous": () => cycleTab(-1),
  "cycle-next": () => cycleTab(1),
  "highlight-left": () => highlightAdjacentTab(-1),
  "highlight-right": () => highlightAdjacentTab(1),
  "move-previous": () => moveTabs(-1),
  "move-next": () => moveTabs(1),
  "group-tabs": groupTabs,
  "new-window": moveTabsToNewWindow,
  "move-window-previous": () => moveTabsBetweenWindows(-1),
  "move-window-next": () => moveTabsBetweenWindows(1)
};

chrome.commands.onCommand.addListener(async (command) => {
  const handler = commandHandlers[command];
  if (!handler) {
    console.warn(`Unknown Better Hotkeys command: ${command}`);
    return;
  }

  try {
    await handler();
  } catch (error) {
    console.error(`Better Hotkeys command failed: ${command}`, error);
  }
});