import assert from "node:assert/strict";
import { downloadRequest } from "./signed-download.js";

const parsed = downloadRequest.safeParse({
  workOrderId: "WO-1042",
  objectKey: "work-orders/WO-1042/front-door.jpg",
  sessionId: "session-abc",
  dispatchStatus: "onsite",
  technicianFollowUp: "Replace the latch after customer approval",
});
assert.equal(parsed.success, true);
assert.equal(downloadRequest.safeParse({ workOrderId: "", objectKey: "x", sessionId: "s", dispatchStatus: "onsite", technicianFollowUp: "note" }).success, false);
console.log("signed download request boundary: ok");
