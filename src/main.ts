import { createServer } from "node:http";
import { signedDownload } from "./signed-download.js";

const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/work-orders/photo-link") {
    response.writeHead(404).end();
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const result = await signedDownload(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request rejected";
    response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
  }
}).listen(port, () => console.log(`field-service example listening on http://localhost:${port}`));
