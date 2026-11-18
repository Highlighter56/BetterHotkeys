/// <reference types="chrome"/>

import { getSettings } from "./settings-store.js";

/**
 * Better Hotkeys - Background Service Worker
 */

const DEFAULT_QUERY = {
  active: true,
  currentWindow: true,
  windowType: "normal"
};

const WINDOW_FOCUS_DEBOUNCE_MS = 75;
const NO_GROUP_ID = -1;

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
    const window = await chrome.windows.get(windowId);
    const updateInfo = { focused: true };
    if (window.state === "minimized") {
      updateInfo.state = "normal";
    }

    await chrome.windows.update(windowId, updateInfo);
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
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return;
  }

  if (activeTab.groupId !== NO_GROUP_ID) {
    const settings = await getSettings();
    if (settings.confirmUngroup) {
      await openGroupDialog(activeTab.groupId, "ungroup");
    } else {
      await ungroupGroup(activeTab.groupId);
    }
    return;
  }

  const settings = await getSettings();
  const selectedTabs = sortTabs(await getOperationTabs());
  if (selectedTabs.length === 0) {
    return;
  }

  const tabs = await expandTabsToWholeGroups(selectedTabs);
  const groupId = await chrome.tabs.group({
    tabIds: tabs.map((tab) => tab.id)
  });
  if (settings.showGroupCustomization) {
    await openGroupDialog(groupId, "customize");
  }
}

async function expandTabsToWholeGroups(tabs) {
  const expandedTabs = new Map(tabs.map((tab) => [tab.id, tab]));
  const groupIds = new Set(
    tabs
      .filter((tab) => tab.groupId !== NO_GROUP_ID)
      .map((tab) => tab.groupId)
  );

  for (const groupId of groupIds) {
    const groupTabs = await chrome.tabs.query({ groupId });
    for (const tab of groupTabs) {
      expandedTabs.set(tab.id, tab);
    }
  }

  return sortTabs([...expandedTabs.values()]);
}

async function openGroupDialog(groupId, mode) {
  const params = new URLSearchParams({
    groupId: String(groupId),
    mode
  });
  await chrome.windows.create({
    url: `${chrome.runtime.getURL("pages/group-dialog.html")}?${params}`,
    type: "popup",
    focused: true,
    width: 380,
    height: mode === "ungroup" ? 200 : 170
  });
}

async function ungroupGroup(groupId) {
  const tabs = await chrome.tabs.query({ groupId });
  if (tabs.length === 0) {
    throw new Error(`Tab group ${groupId} no longer exists.`);
  }
  await chrome.tabs.ungroup(tabs.map((tab) => tab.id));
}

async function toggleGroupCollapse() {
  const activeTab = await getActiveTab();
  if (!activeTab || activeTab.groupId === NO_GROUP_ID) {
    return;
  }

  const group = await chrome.tabGroups.get(activeTab.groupId);
  await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
}


/* ==========================================================
 * NAVIGATION & SELECTION HANDLERS (Cycling & Highlighting)
 * ========================================================== */

function getNavigationStops(tabs, collapsedGroupIds) {
  const stops = [];
  const groupStops = new Map();

  for (const tab of tabs) {
    if (collapsedGroupIds.has(tab.groupId)) {
      let stop = groupStops.get(tab.groupId);
      if (!stop) {
        stop = { key: `group:${tab.groupId}`, tabs: [] };
        groupStops.set(tab.groupId, stop);
        stops.push(stop);
      }
      stop.tabs.push(tab);
    } else {
      stops.push({ key: `tab:${tab.id}`, tabs: [tab] });
    }
  }

  return stops;
}

async function getNavigationTarget(activeTab, direction) {
  if (!activeTab || activeTab.index < 0) {
    return null;
  }

  const [windowTabs, groups] = await Promise.all([
    chrome.tabs.query({ windowId: activeTab.windowId }),
    chrome.tabGroups.query({ windowId: activeTab.windowId })
  ]);
  const collapsedGroups = groups.filter((group) => group.collapsed);
  const collapsedGroupIds = new Set(collapsedGroups.map((group) => group.id));
  const stops = getNavigationStops(sortTabs(windowTabs), collapsedGroupIds);
  if (stops.length < 2) {
    return null;
  }

  const currentStopIndex = stops.findIndex((stop) =>
    stop.tabs.some((tab) => tab.id === activeTab.id)
  );
  if (currentStopIndex < 0) {
    return null;
  }

  const targetIndex =
    (currentStopIndex + direction + stops.length) % stops.length;
  const targetStop = stops[targetIndex];
  const targetTab = direction > 0
    ? targetStop.tabs[0]
    : targetStop.tabs[targetStop.tabs.length - 1];

  return {
    tabId: targetTab.id,
    collapsedGroups
  };
}

async function preserveCollapsedGroups(groups) {
  for (const group of groups) {
    const currentGroup = await chrome.tabGroups.get(group.id);
    if (!currentGroup.collapsed) {
      await chrome.tabGroups.update(group.id, { collapsed: true });
    }
  }
}

async function cycleTab(direction) {
  const target = await getNavigationTarget(await getActiveTab(), direction);
  if (!target) {
    return;
  }

  await chrome.tabs.update(target.tabId, { active: true });
  await preserveCollapsedGroups(target.collapsedGroups);
}

async function highlightAdjacentTab(direction) {
  const activeTab = await getActiveTab();
  const target = await getNavigationTarget(activeTab, direction);
  if (!activeTab || !target) {
    return;
  }

  const targetTab = await chrome.tabs.get(target.tabId);
  const highlightedIds = new Set(
    (await chrome.tabs.query({ windowId: activeTab.windowId }))
      .filter((tab) => tab.highlighted)
      .map((tab) => tab.id)
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
  await preserveCollapsedGroups(target.collapsedGroups);
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

function getGroupEdgeTabIds(selectedTabs, windowTabs, direction) {
  const edgeTabIds = new Set();
  for (const tab of selectedTabs) {
    if (tab.groupId === NO_GROUP_ID) {
      continue;
    }

    const groupTabs = windowTabs.filter(
      (windowTab) => windowTab.groupId === tab.groupId
    );
    const edgeTab = direction < 0
      ? groupTabs[0]
      : groupTabs[groupTabs.length - 1];
    if (edgeTab?.id === tab.id) {
      edgeTabIds.add(tab.id);
    }
  }
  return edgeTabIds;
}

async function moveSelectedTab(tabId, direction, edgeTabIds) {
  const current = await chrome.tabs.get(tabId);
  const windowTabs = sortTabs(
    await chrome.tabs.query({ windowId: current.windowId })
  );

  if (current.groupId !== NO_GROUP_ID) {
    if (edgeTabIds.has(current.id)) {
      await chrome.tabs.ungroup(current.id);
      return;
    }

    const neighbor = windowTabs.find(
      (tab) => tab.index === current.index + direction
    );
    if (neighbor?.groupId === current.groupId) {
      await chrome.tabs.move(current.id, {
        index: current.index + direction
      });
    }
    return;
  }

  const neighbor = windowTabs.find(
    (tab) => tab.index === current.index + direction
  );
  if (
    neighbor &&
    !current.pinned &&
    neighbor.groupId !== NO_GROUP_ID
  ) {
    const group = await chrome.tabGroups.get(neighbor.groupId);
    await chrome.tabs.group({
      tabIds: current.id,
      groupId: neighbor.groupId
    });

    const joinedTab = await chrome.tabs.get(current.id);
    if (joinedTab.index !== current.index) {
      await chrome.tabs.move(current.id, { index: current.index });
    }

    if (group.collapsed) {
      const currentGroup = await chrome.tabGroups.get(group.id);
      if (!currentGroup.collapsed) {
        await chrome.tabGroups.update(group.id, { collapsed: true });
      }
    }
    return;
  }

  const samePinState = windowTabs.filter(
    (tab) => tab.pinned === current.pinned
  );
  const firstIndex = samePinState[0].index;
  const lastIndex = samePinState[samePinState.length - 1].index;
  const targetIndex = current.index + direction;

  if (targetIndex >= firstIndex && targetIndex <= lastIndex) {
    await chrome.tabs.move(current.id, { index: targetIndex });
    return;
  }

  await chrome.tabs.move(current.id, {
    index: direction < 0 ? lastIndex : firstIndex
  });
}

async function moveTabs(direction) {
  const selectedTabs = sortTabs(await getOperationTabs());
  if (selectedTabs.length === 0) {
    return;
  }

  const windowTabs = sortTabs(await chrome.tabs.query({
    windowId: selectedTabs[0].windowId
  }));
  const edgeTabIds = getGroupEdgeTabIds(
    selectedTabs,
    windowTabs,
    direction
  );
  const tabsToMove = selectedTabs.filter((tab) => !edgeTabIds.has(tab.id));
  if (direction > 0) {
    tabsToMove.reverse();
  }

  for (const tab of selectedTabs.filter((candidate) => edgeTabIds.has(candidate.id))) {
    await moveSelectedTab(tab.id, direction, edgeTabIds);
  }

  for (const tab of tabsToMove) {
    await moveSelectedTab(tab.id, direction, edgeTabIds);
  }
}

async function createWindowMoveEntries(selectedTabs) {
  const tabs = await expandTabsToWholeGroups(selectedTabs);
  const entries = [];
  const seenGroupIds = new Set();

  for (const tab of tabs) {
    if (tab.groupId === NO_GROUP_ID) {
      entries.push({ type: "tab", tabId: tab.id, index: tab.index });
      continue;
    }

    if (seenGroupIds.has(tab.groupId)) {
      continue;
    }
    seenGroupIds.add(tab.groupId);

    const groupTabs = tabs.filter(
      (groupTab) => groupTab.groupId === tab.groupId
    );
    const group = await chrome.tabGroups.get(tab.groupId);
    entries.push({
      type: "group",
      group,
      tabIds: groupTabs.map((groupTab) => groupTab.id),
      index: groupTabs[0].index
    });
  }

  return entries.sort((left, right) => left.index - right.index);
}

async function moveWindowEntries(entries, windowId) {
  const movedGroups = [];
  for (const entry of entries) {
    if (entry.type === "tab") {
      await chrome.tabs.move(entry.tabId, { windowId, index: -1 });
      continue;
    }

    const movedGroup = await chrome.tabGroups.move(entry.group.id, {
      windowId,
      index: -1
    });
    const groupId = movedGroup?.id ?? entry.group.id;
    const currentGroup = await chrome.tabGroups.get(groupId);
    const updates = {};
    if (currentGroup.title !== entry.group.title) {
      updates.title = entry.group.title || "";
    }
    if (currentGroup.color !== entry.group.color) {
      updates.color = entry.group.color;
    }
    if (currentGroup.collapsed !== entry.group.collapsed) {
      updates.collapsed = entry.group.collapsed;
    }
    if (Object.keys(updates).length > 0) {
      await chrome.tabGroups.update(groupId, updates);
    }
    movedGroups.push({
      ...currentGroup,
      ...updates,
      id: groupId,
      collapsed: entry.group.collapsed
    });
  }
  return movedGroups;
}

async function moveTabsToNewWindow() {
  const selectedTabs = sortTabs(await getOperationTabs());
  if (selectedTabs.length === 0) {
    return;
  }

  const entries = await createWindowMoveEntries(selectedTabs);
  const newWindow = await chrome.windows.create({ focused: false });
  const placeholderTabs = await chrome.tabs.query({ windowId: newWindow.id });
  const movedGroups = await moveWindowEntries(entries, newWindow.id);
  if (placeholderTabs.length > 0) {
    await chrome.tabs.remove(placeholderTabs.map((tab) => tab.id));
  }

  await highlightTabsAndActivate(
    newWindow.id,
    selectedTabs.map((tab) => tab.id),
    selectedTabs[0].id
  );
  await preserveCollapsedGroups(movedGroups);
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

  const selectedTabs = sortTabs(await getOperationTabs());
  if (selectedTabs.length === 0) {
    return;
  }

  const entries = await createWindowMoveEntries(selectedTabs);
  const movedGroups = await moveWindowEntries(entries, targetWindow.id);
  await highlightTabsAndActivate(
    targetWindow.id,
    selectedTabs.map((tab) => tab.id),
    selectedTabs[0].id
  );
  await preserveCollapsedGroups(movedGroups);
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
  "toggle-group-collapse": toggleGroupCollapse,
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