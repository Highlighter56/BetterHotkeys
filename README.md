# Better Hotkeys

A dependency-free Chrome Manifest V3 extension that adds keyboard shortcuts for
common tab operations.

## Install locally or download the code

Download the [repository from GitHub](https://github.com/Highlighter56/BetterHotkeys)
using **Code → Download ZIP**, (make sure to unzip once downloaded) or clone it:

```sh
git clone https://github.com/Highlighter56/BetterHotkeys.git
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

## Commands

| Command | Description |
| --- | --- |
| Display Popup | Displays a pop up menu in chrome that shows the currently set commands, links to `chrome://extentions/shortcuts`, and displays some minor settings |
| Focus Chrome | Make sure to **Set Scope to Global**, otherwise this command will not work as intended<br> If chrome is opened, will bring it into focus. If multiple chrome tabs are open, it will cycle through |
| Duplicate | Duplicates the activate tab(s) |
| Move Tab(s) to New Window | Moves the activate tab(s) to a new chrome window |
| Pin/Unpin | Toggles whether a tab is Pinned or Unpinned |
| Group/Ungroup Tabs | If called on a group of tabs that are not currenlty gruoped, will group them. <br> If called while the active tab is already part of a group, will ungroup them |
| Expand/Collapse Group | If called while the active tab is inside a group, will toggle whether a group is Collapsed or Expanded <br> If called outside a group, nothing will happen |
| Activate Right/Left | Activates the tab to right/left of the currenlty active tab |
| Highlight Right/Left | Highlights the currnet tab, and the tab to the Right/Left. <br> Can be called multipel times to highlight many tabs |
| Move Tab(s) Right/Left | Moves the active tab(s) to the Right/Left |
| Move Tab(s) to Next/Previous Window | Moves the activate tab(s) between existing chrome windows |
---

## Popup Menu Settings

| Setting | Description |
| --- | --- |
| Show Menu on Group | When Enabled, displays a menu allowing you to set the name and color of the newly created Groups |
| Confirm Before Ungroup | When Enabled, asks the user to confirm before Ungrouping a set of tabs |
| Display Recommended Commands | When Enabled, will display my recomended keybinds for each command in the pop up menu |


## Shortcut Limitations

Chrome allows each extention to set a max of 4 keybinds by default. Upon instalation, these commands will already be set:
* Display Popup
* Duplicate
* Group/Ungroup
* Open tab(s) in New Window

The rest of the commands can be set at `chrome://extensions/shortcuts`. 

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

Better Hotkeys is licensed under the [MIT License with the Commons Clause](./LICENSE). You are free to use and modify, but can not sell in any way.
