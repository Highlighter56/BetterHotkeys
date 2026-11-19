# Better Hotkeys

A dependency-free Chrome Manifest V3 extension that adds keyboard shortcuts for
common tab operations.

## Install locally or download the code

Download the [repository from GitHub](https://github.com/Highlighter56/BetterHotkeys)
using **Code → Download ZIP**, or clone it:

```sh
git clone https://github.com/Highlighter56/BetterHotkeys.git
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

## Commands

| Command | Shortcut |
| --- | --- |
| Display Popup | `Alt+Shift+M` |
| Focus Chrome | (Global) `Ctrl+Shift+5` |
| Duplicate | `Alt+Shift+D` |
| Move Tab(s) to New Window | Assign in `chrome://extensions/shortcuts` |
| Pin/Unpin | Assign in `chrome://extensions/shortcuts` |
| Group/Ungroup Tabs | `Alt+Shift+G` |
| Expand/Collapse Group | Assign in `chrome://extensions/shortcuts` |
| Activate Right/Left | Assign in `chrome://extensions/shortcuts` |
| Highlight Right/Left | Assign in `chrome://extensions/shortcuts` |
| Move Tab(s) Right/Left | Assign in `chrome://extensions/shortcuts` |
| Move Tab(s) to Next/Previous Window | Assign in `chrome://extensions/shortcuts` |

`Activate Extension` is Chrome's reserved action command and remains available
in Chrome's shortcut manager without a default assignment. `Display Popup` is
the user-facing equivalent standard command and opens the extension settings
popup with the default `Alt+Shift+M`. `Focus Chrome` returns
focus to Chrome when another application is active and cycles through open
normal Chrome windows on repeated presses. `Duplicate` duplicates the active
tab. `Move Tab(s) to New Window` moves the active or highlighted tabs into a
new window.

`Group/Ungroup Tabs` creates a group from highlighted tabs, or ungroups the
active tab's entire group. `Expand/Collapse Group` toggles the active group's
collapsed state. `Activate Right/Left` moves the active tab through the tab
strip. `Highlight Right/Left` moves through the tab strip while building a
highlighted selection. `Move Tab(s) Right/Left` reorders the active or
highlighted tabs. Window movement commands move selected tabs between windows.

The settings page includes options for the group customization menu,
ungroup confirmation, and recommended shortcut visibility. Group customization
supports a name and Chrome's group colors; pressing Enter applies the form.
Canceling the ungroup confirmation with Enter leaves the group unchanged.

## Shortcut limitations

Chrome allows only four suggested extension shortcuts. Other commands are
available in `chrome://extensions/shortcuts`, where shortcuts can be assigned
or changed. Chrome may preserve existing user assignments when the extension is
updated, and operating-system shortcuts can take priority.

Global defaults must use Chrome's supported `Ctrl+Shift+[0-9]` format and are
not supported on ChromeOS. Chrome also handles built-in shortcuts such as
`Ctrl+Tab` before extension commands.

## Modifying the extension

The extension has three main areas:

- `manifest.json` declares permissions, commands, descriptions, and icons.
- `scripts/background.js` receives commands and performs tab/window operations.
- `pages/` contains the settings page and group customization dialog.

To add a command, add its manifest declaration, add a matching handler in
`scripts/background.js`, and verify it in `chrome://extensions/shortcuts`.
The settings page reads command descriptions and suggested shortcuts directly
from `manifest.json`, so user-facing command labels only need to be updated
there. Keep extension pages free of inline scripts because Manifest V3's CSP
requires external JavaScript files.

## License

This project is released under the MIT License. It permits use, modification,
and redistribution, including commercial use, provided the copyright and
license notice are retained. See [LICENSE](LICENSE).
