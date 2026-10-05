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
| Duplicate active or highlighted tabs | `Alt+Shift+D` |
| Pin/unpin active or highlighted tabs | Assign in `chrome://extensions/shortcuts` |
| Activate previous/next tab | Assign in `chrome://extensions/shortcuts` |
| Move active or highlighted tabs left/right | Assign in `chrome://extensions/shortcuts` |
| Toggle highlight for the active tab | `Alt+Shift+Up` |
| Activate previous/next tab while preserving highlights | `Alt+Shift+Left/Right` |
| Group active or highlighted tabs | Assign in `chrome://extensions/shortcuts` |
| Move active or highlighted tabs to a new window | Assign in `chrome://extensions/shortcuts` |
| Move tabs to the previous/next Chrome window | Assign in `chrome://extensions/shortcuts` |

The extension uses Chrome's native highlighted-tab state. When multiple tabs
are highlighted, supported operations apply to the whole selection.

## Shortcut limitations

Chrome extension commands are individual key combinations; they cannot detect
that a modifier combination is being held as a temporary mode. The requested highlighting behavior is represented by separate commands:

- `Alt+Shift+Left/Right` — activate the adjacent tab without intentionally
  clearing the existing highlighted tabs
- `Alt+Shift+Up` — toggle highlighting for the active tab

This is intended to behave like repeated Ctrl-click selection: navigate to a
tab, toggle its highlight state, navigate to another tab, and toggle again.

Window movement wraps from the last normal Chrome window to the first and
focuses the destination window after moving the tab selection.

Grouping opens a Better Hotkeys dialog immediately after the group is created,
so you can set its title and color without needing to open Chrome's group menu.

Chrome limits each extension to four default shortcut assignments. Duplicate,
previous-tab, next-tab, and active-highlight use those defaults; assign every
other command through `chrome://extensions/shortcuts`. Chrome or the operating
system may reserve individual combinations.
