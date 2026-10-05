const DEFAULT_QUERY = {
  active: true,
  currentWindow: true,
  windowType: "normal"
};

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

async function cycleTab(direction) {
  const activeTab = await getActiveTab();
  if (!activeTab || activeTab.index < 0) {
    return;
  }

  const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  if (tabs.length < 2) {
    return;
  }

  const highlightedIds = tabs
    .filter((tab) => tab.highlighted)
    .map((tab) => tab.id);
  const nextIndex = (activeTab.index + direction + tabs.length) % tabs.length;
  const targetId = tabs[nextIndex].id;

  if (highlightedIds.length === 0) {
    await chrome.tabs.update(targetId, { active: true });
    return;
  }

  await selectTabsAndActivate(
    activeTab.windowId,
    [...new Set([...highlightedIds, targetId])],
    targetId
  );
}

async function selectTabsAndActivate(windowId, tabIds, activeTabId) {
  const tabs = await chrome.tabs.query({ windowId });
  const selectedIds = new Set(tabIds);
  const selectedTabs = tabs
    .filter((tab) => selectedIds.has(tab.id))
    .sort((left, right) => left.index - right.index);
  const activeTab = selectedTabs.find((tab) => tab.id === activeTabId);

  if (!activeTab || selectedTabs.length === 0) {
    return;
  }

  const indexes = selectedTabs
    .filter((tab) => tab.id !== activeTabId)
    .map((tab) => tab.index);
  indexes.push(activeTab.index);
  await chrome.tabs.highlight({ windowId, tabs: indexes });
}

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

async function toggleActiveHighlight() {
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return;
  }

  await chrome.tabs.update(activeTab.id, {
    highlighted: !activeTab.highlighted
  });
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
  await selectTabsAndActivate(
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
  await selectTabsAndActivate(targetWindow.id, movedTabIds, tabs[0].id);
  await chrome.windows.update(targetWindow.id, { focused: true });
}

const commandHandlers = {
  "duplicate-tab": duplicateTabs,
  "toggle-pin": togglePin,
  "cycle-previous": () => cycleTab(-1),
  "cycle-next": () => cycleTab(1),
  "move-previous": () => moveTabs(-1),
  "move-next": () => moveTabs(1),
  "highlight-active": toggleActiveHighlight,
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