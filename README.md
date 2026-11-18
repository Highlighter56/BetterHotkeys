# Better Hotkeys

A dependency-free Chrome Manifest V3 extension that adds keyboard shortcuts for
common tab operations.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

## Default commands

| Command | Shortcut |
| --- | --- |
| Activate Extension | Browser-provided action shortcut; assignment availability depends on Chrome |
| Focus Chrome | Assign in `chrome://extensions/shortcuts` (global scope; no default) |
| Duplicate | `Alt+Shift+D` |
| Pin/Unpin | Assign in `chrome://extensions/shortcuts` |
| Group/Ungroup Tabs | Assign in `chrome://extensions/shortcuts` |
| Highlight Right/Left | Assign in `chrome://extensions/shortcuts` |
| Activate Right/Left | `Alt+Period` / `Alt+Comma` |
| Expand/Collapse Group | Assign in `chrome://extensions/shortcuts` (recommended: `Alt+Shift+U` / `Option+Shift+U` on Mac) |
| Move Tab(s) Right/Left | Assign in `chrome://extensions/shortcuts` |
| Move Tab(s) to New Window | Assign in `chrome://extensions/shortcuts` |
| Move Tab(s) to Next Window | Assign in `chrome://extensions/shortcuts` |
| Move Tab(s) to Previous Window | Assign in `chrome://extensions/shortcuts` |

The extension uses Chrome's native highlighted-tab state. When multiple tabs
are highlighted, supported operations apply to the whole selection.

## Shortcut limitations

Chrome extension commands are individual key combinations; they cannot detect
that a modifier combination is being held as a temporary mode. The requested highlighting behavior is represented by separate commands:

- Assign `Highlight Left` and `Highlight Right` in
  `chrome://extensions/shortcuts` to navigate while building a highlighted
  selection. Moving into an unhighlighted tab adds the current and destination
  tabs; moving into an already-highlighted tab removes the tab being left.

This is intended to behave like repeated Ctrl-click selection: navigate to a
tab, toggle its highlight state, navigate to another tab, and toggle again.

Activate and Highlight Left/Right treat a collapsed group as one navigation
stop without expanding it. The active edge tab in a collapsed group can be
expanded or collapsed with `Expand/Collapse Group`. Expanded groups are
traversed tab by tab.

Window movement wraps from the last normal Chrome window to the first and
focuses the destination window after moving the tab selection.

Moving tabs left or right shifts them by one position. A tab wraps to the other
end of its pinned or unpinned section only when it is already at that edge and
is moved farther in that direction. A grouped tab moving outward from its
group edge is ungrouped in place; an adjacent ungrouped tab moving inward joins
the group in place. Further moves reorder the tab normally.

`Group/Ungroup Tabs` creates a group from the highlighted tabs, or ungroups the
active tab's entire group. The settings page has separate, ON-by-default
options to show the group customization menu and confirm before ungrouping, as
well as a setting to show or hide recommended shortcuts.
When customization is enabled, the popup follows Chrome's compact name-and-
color layout; press Enter to apply the selected name and color. Ungrouping
preserves the tabs and their order. When moving a selection between windows,
any selected group moves as a whole, including unhighlighted members.

Chrome limits each extension to four default shortcut assignments. Duplicate,
Activate Right, and Activate Left use the defaults; assign every other command
through `chrome://extensions/shortcuts`. Chrome or the operating system may
reserve individual combinations.

`Focus Chrome` returns focus to Chrome when another application is active and
cycles through open normal Chrome windows on repeated presses. It has no
default shortcut, so assign a global shortcut in
`chrome://extensions/shortcuts`. Chrome must be running for a global command
to be delivered; ChromeOS may not honor the global scope. Focusing a window
does not open the extension popup. Minimized windows are restored without
changing the size or maximized state of already-open windows.

Chrome handles its built-in `Ctrl+Tab` and `Ctrl+Shift+Tab` shortcuts before
extension commands, so an extension cannot disable or rebind them. `Activate
Right` and `Activate Left` are additional shortcuts and do not replace Chrome's
built-in tab switching.

Chrome provides the `Activate Extension` action shortcut for this extension's
popup. It is not declared by Better Hotkeys. The settings page shows its
assigned shortcut when Chrome exposes it, `Unassigned` when Chrome exposes it
without a shortcut, and `Unavailable` when Chrome does not expose it through
the commands API.
