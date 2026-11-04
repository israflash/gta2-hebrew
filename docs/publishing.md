# Publishing and maintaining the Hebrew site

## Repository layout

Keep this repository as the source fork of `M1sterMo/gta2-browser`: the original project stays
the `upstream` remote, while `origin` points to the public Hebrew fork, `gta2-hebrew`. The
published website is the generated static output from `scripts/build_pages.py`, not the source
tree. Its address is `https://israflash.github.io/gta2-hebrew/`.

The GitHub Pages site contains the original browser engine/WASM, Hebrew catalogs and font, and
frontend files. It must never contain the installed game files, original save data, or local QA
screenshots. On first play, the original loader downloads and unpacks the freeware installer in
the player's browser; the browser keeps game files and saves locally for that site origin.

## Stable release workflow

`.github/workflows/publish-pages.yml` runs only when a non-prerelease GitHub Release with a `v`
tag is published. It runs the static translation/runtime checks, fetches the pinned engine
sources and Emscripten 6.0.12, builds the release WASM and static package, preserves the previous
published WASM build under `old/`, and deploys the Pages artifact. A push to `main`, a branch,
or a draft/prerelease does not publish the live site. The release publication is the approval
gate.

The `gh-pages` branch stores the last static output so the next release can archive the version
that players used before the update. The actual Pages deployment uses the GitHub Actions artifact.
This keeps earlier frontend/WASM versions available to the save screen, which can reopen a save
with the engine build that created it. Do not delete the `old/` history branch when cleaning up.

## Local release process

1. Develop in the source repository. Keep `origin` on the Hebrew fork and `upstream` on
   `https://github.com/M1sterMo/gta2-browser.git`.
2. Pull upstream changes into a separate branch and review them against the Hebrew patches before
   merging. Never auto-merge upstream into the public release branch.
3. Run `./run-local.ps1`, then run the available catalog, source-inventory, and browser QA checks.
   Do not add the `game/`, `downloads/`, `research/`, or `build/` folders to Git.
4. Create a version tag such as `v1.0.0`, push it, and publish a non-prerelease GitHub Release
   only after the tests pass. Publishing that release starts the Pages workflow.
5. Check the Actions run and the Pages URL before sharing the update. Open tabs are not force-
   refreshed; new files load on the next page load. JavaScript, WASM, translation JSON, and font
   URLs receive the same content-version query so a browser does not combine assets from two
   releases.

## Player save and data behavior

Browser storage is per origin and per browser profile. `localhost` and the public Pages URL do
not share IndexedDB/localStorage. To move progress between them or between computers, export the
save/map package on the old site and import it on the new one. A new computer/profile must load
or select its own game files; commercial files are not transferred by this repository.

The deployment keeps old WASM releases available for saves that require an earlier engine build.
This cannot restore data if a player clears browser storage, loses an export, or uses another
browser profile. Export important saves before changing computers.

## Current deployment state

The source workflow and static package have been prepared and tested locally. The public fork,
GitHub Pages settings, first public deployment, and cross-origin save transfer require a GitHub
account with repository creation/push access; none is claimed as complete until verified online.
