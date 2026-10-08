import { z } from "zod";
import { infrai } from "./infrai.js";

export const downloadRequest = z.object({
  workOrderId: z.string().min(1),
  objectKey: z.string().min(1),
  sessionId: z.string().min(1),
  dispatchStatus: z.enum(["assigned", "en_route", "onsite", "complete"]),
  technicianFollowUp: z.string().min(1),
});

export type DownloadRequest = z.infer<typeof downloadRequest>;
const BUCKET = "field-service-private";

export async function signedDownload(input: DownloadRequest): Promise<{ workOrderId: string; url: string; dispatchStatus: string; technicianFollowUp: string }> {
  const request = downloadRequest.parse(input);
  const session = await infrai.auth.session.verify(request.sessionId);
  if (!session.valid) throw new Error("Session is not valid for this work order");
  const signed = await infrai.storage.object.presign(BUCKET, request.objectKey, {
    op: "get",
    expires_seconds: 300,
    response_disposition: "inline",
  });
  return { workOrderId: request.workOrderId, url: signed.url, dispatchStatus: request.dispatchStatus, technicianFollowUp: request.technicianFollowUp };
}
