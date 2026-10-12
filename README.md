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
| Duplicate | `Alt+Shift+D` |
| Pin/Unpin | Assign in `chrome://extensions/shortcuts` |
| Group/Ungroup Tabs | Assign in `chrome://extensions/shortcuts` |
| Highlight Right/Left | Assign in `chrome://extensions/shortcuts` |
| Activate Right/Left | `Alt+Shift+Right/Left` |
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

Window movement wraps from the last normal Chrome window to the first and
focuses the destination window after moving the tab selection.

Grouping opens a Better Hotkeys dialog immediately after the group is created,
so you can set its title and color without needing to open Chrome's group menu.

Chrome limits each extension to four default shortcut assignments. Duplicate,
Activate Right, and Activate Left use the defaults; assign every other command
through `chrome://extensions/shortcuts`. Chrome or the operating system may
reserve individual combinations.

Chrome provides the `Activate Extension` action shortcut for this extension's
popup. It is not declared by Better Hotkeys. The settings page shows its
assigned shortcut when Chrome exposes it, `Unassigned` when Chrome exposes it
without a shortcut, and `Unavailable` when Chrome does not expose it through
the commands API.
