# The Princess Bride: A Story Worth Interrupting

An illustrated, static interactive novella made with Twee and SugarCube 2. Version 1 implements the complete story in [`narrative/narrative-design.md`](narrative/narrative-design.md), including its bedroom framing story, branching choices, and ending.

## Setup (Windows 11 x64)

Requirements: Node.js 18 or newer (including npm) and an internet connection for the initial toolchain download.

Run `npm install` once after cloning. Its postinstall script installs the repository-local Tweego **2.1.1** executable and SugarCube **2.37.3** into the ignored `temp/tweego/` directory. These versions come from the [official Tweego v2.1.1 Windows x64 release](https://github.com/tmedwards/tweego/releases/download/v2.1.1/tweego-2.1.1-windows-x64.zip) and the [official SugarCube v2.37.3 local-format release](https://github.com/tmedwards/sugarcube-2/releases/download/v2.37.3/sugarcube-2.37.3-for-twine-2.1-local.zip). No system-wide Tweego install or additional npm packages are required.

If the ignored tool directory is missing or damaged, rerun `npm install` or run `npm run setup:tweego` to repair it. The setup command can also be run any time; it skips a complete, correctly versioned installation.

The local toolchain setup currently supports Windows 11 x64. Other operating systems and CPU architectures are not supported.

## Build and preview

Run these commands from the repository folder:

```powershell
npm run build
npm run preview
```

Open the printed local URL (by default, `http://127.0.0.1:8080`). Stop the preview server with `Ctrl+C`. To choose another port, set `$env:PORT` before running `npm run preview`.

The build compiles `src/story.twee` into `dist/index.html` and copies the approved illustrations to `dist/assets/images/`. The project has no third-party npm dependencies.

In VS Code, run **Terminal: Run Build Task** to build, or open **Tasks: Run Task** and select **Preview game** to build and start the local preview together. Stop the preview task from the terminal's stop button or with `Ctrl+C`.

## Adding passages and illustrations

1. Add the passage to `src/story.twee` using Twee syntax (`:: PassageName`).
2. Link to it from the relevant choice or continuation with SugarCube's `<<link>>` macro.
3. If the passage needs an illustration, tag it with the matching `art-##` tag (for example, `:: PassageName [art-03]`), then add the image path and descriptive alt text under that tag in `setup.sceneImages` in the `StoryScript` passage. Add `<<sceneImage>>` where the image should appear. Passages without a matching illustration can omit the art tag.
4. Put new source images in `assets/images/`; the build copies that folder into `dist/assets/images/`.
5. Run `npm run build` and review the game with `npm run preview`.

The shared image widget keeps illustration layout consistent; passages with the same art tag can share an image without repeating its path or alt text.

## Current scope

The complete v1 story follows all 15 manuscript beats from the bedside opening through the final page. Choices have their written responses and rejoin or retry as specified; there are no inventory systems or alternate endings.
