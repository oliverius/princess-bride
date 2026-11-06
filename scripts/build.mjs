import { spawnSync } from "node:child_process";
import { access, cp, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceFile = path.join(projectRoot, "src", "story.twee");
const toolsDirectory = path.join(projectRoot, "temp", "tweego");
const tweego = path.join(toolsDirectory, "tweego.exe");
const storyFormats = path.join(toolsDirectory, "storyformats");
const outputDirectory = path.join(projectRoot, "dist");
const temporaryOutput = path.join(outputDirectory, ".index.html.tmp");
const outputFile = path.join(outputDirectory, "index.html");
const imageSource = path.join(projectRoot, "assets", "images");
const imageOutput = path.join(outputDirectory, "assets", "images");

try {
	await access(tweego);
	await access(path.join(storyFormats, "sugarcube-2", "format.js"));
} catch (error) {
	if (error.code === "ENOENT") {
		throw new Error("Local Tweego is not installed. Run `npm install` or `npm run setup:tweego` first.");
	}
	throw error;
}

await mkdir(outputDirectory, { recursive: true });

const compile = spawnSync(
	tweego,
	["--format=sugarcube-2", "--output", temporaryOutput, sourceFile],
	{
		cwd: projectRoot,
		stdio: "inherit",
		env: { ...process.env, TWEEGO_PATH: storyFormats }
	}
);

if (compile.error) {
	if (compile.error.code === "ENOENT") {
		throw new Error(`Could not start repository-local Tweego at ${tweego}. Run \`npm run setup:tweego\` to repair the installation.`);
	}
	throw compile.error;
}

if (compile.status !== 0) {
	throw new Error(`Tweego exited with status ${compile.status ?? "unknown"}.`);
}

try {
	const outputStat = await stat(temporaryOutput);
	if (!outputStat.isFile()) {
		throw new Error(`Tweego did not create the expected output file: ${temporaryOutput}`);
	}
} catch (error) {
	if (error.code === "ENOENT") {
		throw new Error(`Tweego did not create the expected output file: ${temporaryOutput}`);
	}
	throw error;
}

await rm(imageOutput, { recursive: true, force: true });
await mkdir(imageOutput, { recursive: true });
await cp(imageSource, imageOutput, { recursive: true });
await rm(outputFile, { force: true });
await rename(temporaryOutput, outputFile);

console.log(`Built ${path.relative(projectRoot, outputFile)}.`);
