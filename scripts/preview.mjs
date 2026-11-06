import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(projectRoot, "dist");
const indexFile = path.join(distDirectory, "index.html");
const port = Number(process.env.PORT || 8080);
const contentTypes = new Map([
	[".html", "text/html; charset=utf-8"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".jpg", "image/jpeg"],
	[".mp3", "audio/mpeg"],
	[".css", "text/css; charset=utf-8"],
	[".svg", "image/svg+xml"]
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new Error(`PORT must be an integer between 1 and 65535. Received: ${process.env.PORT}`);
}

try {
	await access(indexFile);
} catch (error) {
	if (error.code === "ENOENT") {
		throw new Error("No built game found. Run `npm run build` before `npm run preview`.");
	}
	throw error;
}

const server = createServer((request, response) => {
	if (request.method !== "GET" && request.method !== "HEAD") {
		response.writeHead(405, { Allow: "GET, HEAD" });
		response.end("Method not allowed.");
		return;
	}

	let pathname;
	try {
		pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
	} catch {
		response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
		response.end("Invalid request path.");
		return;
	}

	const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
	const filePath = path.resolve(distDirectory, relativePath);
	const relativeToDist = path.relative(distDirectory, filePath);

	if (
		relativeToDist === ".." ||
		relativeToDist.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativeToDist)
	) {
		response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		response.end("Forbidden.");
		return;
	}

	stat(filePath)
		.then((fileStat) => {
			if (!fileStat.isFile()) {
				response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
				response.end("Not found.");
				return;
			}

			response.writeHead(200, {
				"Cache-Control": "no-cache",
				"Content-Length": fileStat.size,
				"Content-Type": contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream"
			});

			if (request.method === "HEAD") {
				response.end();
				return;
			}

			createReadStream(filePath).pipe(response);
		})
		.catch((error) => {
			if (error.code === "ENOENT" || error.code === "ENOTDIR") {
				response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
				response.end("Not found.");
				return;
			}

			console.error(`Failed to serve ${filePath}:`, error);
			response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
			response.end("Unable to serve this file.");
		});
});

server.on("error", (error) => {
	console.error("Preview server failed:", error);
	process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
	console.log(`Previewing the game at http://127.0.0.1:${port}`);
});
