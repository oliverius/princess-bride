import { spawnSync } from "node:child_process";
import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const TWEEGO_VERSION = "2.1.1";
const SUGARCUBE_VERSION = "2.37.3";
const TWEEGO_URL =
	"https://github.com/tmedwards/tweego/releases/download/v2.1.1/tweego-2.1.1-windows-x64.zip";
const SUGARCUBE_URL =
	"https://github.com/tmedwards/sugarcube-2/releases/download/v2.37.3/sugarcube-2.37.3-for-twine-2.1-local.zip";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsParent = path.join(projectRoot, "temp");
const toolsDirectory = path.join(toolsParent, "tweego");
const manifestName = "toolchain.json";

function assertSupportedPlatform() {
	if (process.platform !== "win32" || process.arch !== "x64") {
		throw new Error(
			`Local Tweego setup supports Windows x64 only; received ${process.platform} ${process.arch}.`
		);
	}
}

async function isComplete(directory) {
	try {
		const manifest = JSON.parse(
			await readFile(path.join(directory, manifestName), "utf8")
		);
		const executable = await stat(path.join(directory, "tweego.exe"));
		const format = await readFile(
			path.join(directory, "storyformats", "sugarcube-2", "format.js"),
			"utf8"
		);
		const storyFormats = path.join(directory, "storyformats");
		const versionCheck = spawnSync(path.join(directory, "tweego.exe"), ["--version"], {
			encoding: "utf8",
			env: { ...process.env, TWEEGO_PATH: storyFormats },
			windowsHide: true
		});
		const formatCheck = spawnSync(path.join(directory, "tweego.exe"), ["--list-formats"], {
			encoding: "utf8",
			env: { ...process.env, TWEEGO_PATH: storyFormats },
			windowsHide: true
		});
		const versionOutput = `${versionCheck.stdout ?? ""}${versionCheck.stderr ?? ""}`;
		const formatOutput = `${formatCheck.stdout ?? ""}${formatCheck.stderr ?? ""}`;

		return (
			manifest.tweego === TWEEGO_VERSION &&
			manifest.sugarcube === SUGARCUBE_VERSION &&
			executable.isFile() &&
			executable.size > 0 &&
			format.includes(`"version":"${SUGARCUBE_VERSION}"`) &&
			!versionCheck.error &&
			versionOutput.includes(`tweego, version ${TWEEGO_VERSION}+`) &&
			!formatCheck.error &&
			formatOutput.includes(`SugarCube (${SUGARCUBE_VERSION})`)
		);
	} catch (error) {
		if (error.code === "ENOENT" || error instanceof SyntaxError) {
			return false;
		}
		throw error;
	}
}

async function downloadArchive(url, destination) {
	let response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
	} catch (error) {
		throw new Error(`Could not download ${url}: ${error.message}`, { cause: error });
	}

	if (!response.ok) {
		throw new Error(`Could not download ${url}: HTTP ${response.status} ${response.statusText}.`);
	}

	const archive = Buffer.from(await response.arrayBuffer());
	if (archive.length < 4 || archive[0] !== 0x50 || archive[1] !== 0x4b) {
		throw new Error(`The download from ${url} is not a valid ZIP archive.`);
	}

	await writeFile(destination, archive);
}

function extractArchive(archive, destination, label) {
	const extraction = spawnSync("tar.exe", ["-xf", archive, "-C", destination], {
		encoding: "utf8",
		windowsHide: true
	});

	if (extraction.error || extraction.status !== 0) {
		const detail = extraction.error?.message || extraction.stderr.trim() || "unknown extraction error";
		throw new Error(`Could not extract ${label}: ${detail}`, { cause: extraction.error });
	}
}

async function provision(stageDirectory) {
	const downloadsDirectory = path.join(stageDirectory, "downloads");
	const tweegoArchiveDirectory = path.join(stageDirectory, "tweego-archive");
	const sugarcubeArchiveDirectory = path.join(stageDirectory, "sugarcube-archive");
	const installationDirectory = path.join(stageDirectory, "installation");
	const tweegoArchive = path.join(downloadsDirectory, "tweego.zip");
	const sugarcubeArchive = path.join(downloadsDirectory, "sugarcube.zip");

	await mkdir(downloadsDirectory, { recursive: true });
	await mkdir(tweegoArchiveDirectory);
	await mkdir(sugarcubeArchiveDirectory);
	await mkdir(path.join(installationDirectory, "storyformats", "sugarcube-2"), {
		recursive: true
	});

	await downloadArchive(TWEEGO_URL, tweegoArchive);
	await downloadArchive(SUGARCUBE_URL, sugarcubeArchive);
	extractArchive(tweegoArchive, tweegoArchiveDirectory, "Tweego");
	extractArchive(sugarcubeArchive, sugarcubeArchiveDirectory, "SugarCube");

	const tweegoExecutable = path.join(tweegoArchiveDirectory, "tweego.exe");
	const sugarcubeDirectory = path.join(sugarcubeArchiveDirectory, "sugarcube-2");
	const sugarcubeFormat = path.join(sugarcubeDirectory, "format.js");

	try {
		const executable = await stat(tweegoExecutable);
		if (!executable.isFile() || executable.size === 0) {
			throw new Error("The Tweego executable in the downloaded archive is empty.");
		}
		const format = await readFile(sugarcubeFormat, "utf8");
		if (!format.includes(`"version":"${SUGARCUBE_VERSION}"`)) {
			throw new Error(`The downloaded story format is not SugarCube ${SUGARCUBE_VERSION}.`);
		}
	} catch (error) {
		if (error.code === "ENOENT") {
			throw new Error(`The downloaded archive is missing a required file: ${error.path}`, {
				cause: error
			});
		}
		throw error;
	}

	await cp(tweegoExecutable, path.join(installationDirectory, "tweego.exe"));
	await cp(
		sugarcubeDirectory,
		path.join(installationDirectory, "storyformats", "sugarcube-2"),
		{ recursive: true }
	);
	await writeFile(
		path.join(installationDirectory, manifestName),
		JSON.stringify({ tweego: TWEEGO_VERSION, sugarcube: SUGARCUBE_VERSION }, null, 2) + "\n"
	);
}

async function installAtomically(stagedInstallation, backupDirectory) {
	let movedExistingInstallation = false;
	try {
		try {
			await access(toolsDirectory);
			await rename(toolsDirectory, backupDirectory);
			movedExistingInstallation = true;
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error;
			}
		}

		await rename(stagedInstallation, toolsDirectory);
	} catch (error) {
		if (movedExistingInstallation) {
			await rename(backupDirectory, toolsDirectory);
		}
		throw error;
	}

	if (movedExistingInstallation) {
		await rm(backupDirectory, { recursive: true, force: true });
	}
}

async function main() {
	assertSupportedPlatform();
	await mkdir(toolsParent, { recursive: true });

	if (await isComplete(toolsDirectory)) {
		console.log(`Tweego ${TWEEGO_VERSION} and SugarCube ${SUGARCUBE_VERSION} are already installed.`);
		return;
	}

	const stageDirectory = path.join(toolsParent, `.tweego-stage-${randomUUID()}`);
	const backupDirectory = path.join(toolsParent, `.tweego-backup-${randomUUID()}`);

	try {
		await mkdir(stageDirectory);
		console.log(`Installing Tweego ${TWEEGO_VERSION} and SugarCube ${SUGARCUBE_VERSION}...`);
		await provision(stageDirectory);
		await installAtomically(path.join(stageDirectory, "installation"), backupDirectory);
		console.log(`Installed Tweego ${TWEEGO_VERSION} and SugarCube ${SUGARCUBE_VERSION} at ${path.relative(projectRoot, toolsDirectory)}.`);
	} finally {
		await rm(stageDirectory, { recursive: true, force: true });
	}
}

await main();
