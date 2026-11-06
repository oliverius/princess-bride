# The Princess Bride: A Story Worth Interrupting

An illustrated, static interactive novella made with Twee and SugarCube 2. Version 1 implements the complete story in [`narrative/narrative-design.md`](narrative/narrative-design.md), including its bedroom framing story, branching choices, and ending.

[![Live The Greatest Story Ever Told](https://img.shields.io/badge/Live%20The%20Greatest%20Story%20Ever%20Told-8d7135?style=for-the-badge)](https://oliverius.github.io/princess-bride/)

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

The build compiles `src/story.twee` into `dist/index.html` and copies the approved illustrations and background music to `dist/assets/images/` and `dist/assets/audio/`. The project has no third-party npm dependencies.

In VS Code, run **Terminal: Run Build Task** to build, or open **Tasks: Run Task** and select **Preview game** to build and start the local preview together. Stop the preview task from the terminal's stop button or with `Ctrl+C`.

## Adding passages and illustrations

1. Add the passage to `src/story.twee` using Twee syntax (`:: PassageName`).
2. Link to it from the relevant choice or continuation with SugarCube's `<<link>>` macro.
3. If the passage needs an illustration, tag it with the matching `art-##` tag (for example, `:: PassageName [art-03]`), then add the image path and descriptive alt text under that tag in `setup.sceneImages` in the `StoryScript` passage. The persistent illustration above `#passages` resolves the tag automatically; do not add image markup to individual passages. Passages without a matching illustration can omit the art tag.
4. Put new source images in `assets/images/`; the build copies that folder into `dist/assets/images/`.
5. Run `npm run build` and review the game with `npm run preview`.

## GitHub Pages

Pushing to `main` builds the story on Windows and deploys `dist/` to GitHub Pages. The workflow runs `npm ci` (which provisions the pinned Tweego 2.1.1 and SugarCube 2.37.3 toolchain), builds with `npm run build`, checks that the HTML, illustrations, and background music are present, and deploys the build with the official GitHub Pages Actions. `dist/` stays excluded from Git; only the generated Pages artifact is uploaded.

To enable deployment:

1. In the repository on GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
2. Push a commit to `main`, or open **Actions → Build and deploy to GitHub Pages → Run workflow** to deploy manually.
3. Check the workflow run under **Actions**. After it succeeds, find the published URL in the `github-pages` environment under **Settings → Environments**, in the deployment job summary, or on **Settings → Pages**. For this repository, the expected URL is [oliverius.github.io/princess-bride](https://oliverius.github.io/princess-bride/).

If a deployment fails, open the failed run in **Actions** and expand the first failing step. Check that the Pages source is **GitHub Actions**, that the workflow has its `pages: write` and `id-token: write` permissions, and that `npm ci` can download the Tweego and SugarCube archives. A build or asset-verification failure means `dist/index.html`, one or more copied illustrations, or `dist/assets/audio/A tale of true love.mp3` is missing; rerun `npm run build` locally to diagnose it. The relative image and audio URLs in the story work under the repository URL subpath as well as a domain root.

The `StoryInterface` keeps the illustration outside the passage-replaced DOM. Passages with the same art tag retain the same image element and resolved image URL during navigation.

For framing dialogue, add `framing-dialogue` to the dialogue paragraph (for example, `<p class="dialogue framing-dialogue">`) to apply the dusty-blue italic treatment. Keep narration outside that class so only spoken words are styled.

## Background music

The background track is `assets/audio/A tale of true love.mp3`; the build copies it unchanged to `dist/assets/audio/`. Music starts only when the reader activates **Begin Story**, plays on a loop at 25% volume, and continues through passage navigation. The persistent **Music on / Music off** button pauses and resumes playback without restarting the track.

Use `npm run preview` to play the compiled game. Opening `dist/index.html` directly with `file://` may be blocked by browser media/security policies. Importing the Twee source into Twine does not bundle the external MP3; publish or serve the audio at the matching relative path (`assets/audio/A tale of true love.mp3`) alongside the exported story.

## Current scope

The complete v1 story follows all 15 manuscript beats from the bedside opening through the final page. Choices have their written responses and rejoin or retry as specified; there are no inventory systems or alternate endings.
