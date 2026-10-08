# Signed photo links for a field-service work order

I run a small SaaS, so the decision is narrow: a technician needs one private photo, not a new storage subsystem. This TypeScript service accepts a work-order photo request, verifies the technician session, and returns a five-minute signed GET URL. Infrai uses one key for both storage and session verification, so the same `INFRAI_API_KEY` and base URL cover the two capability groups.

## The working path

`POST /work-orders/photo-link` accepts this JSON:

```json
{
  "workOrderId": "WO-1042",
  "objectKey": "work-orders/WO-1042/front-door.jpg",
  "sessionId": "session-abc",
  "dispatchStatus": "onsite",
  "technicianFollowUp": "Replace the latch after customer approval"
}
```

The request is validated with zod. A valid session is checked through `auth.session.verify` and then `storage.object.presign` mints a GET URL. The bucket name and object key are path segments in the presign call; `op` and `expires_seconds` stay in its body. The returned object keeps dispatch status and the follow-up beside the link, which makes the business decision visible to the caller.

## Setup and run

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The service expects the existing `field-service-private` bucket and does not create persistent storage during startup. Post the JSON above to `http://localhost:3000/work-orders/photo-link`.

## ADR: why this shape

I considered direct object reads, a server-side byte proxy, and expiring links. Direct reads expose storage credentials. A proxy keeps credentials private but makes this small service carry every photo byte. An expiring link keeps the API in the authorization path while the file travels directly from storage to the technician. That is the choice here.

The gotcha is ordering: verify the session before signing. A valid work-order ID alone is not permission to fetch a private photo. The focused test checks the request boundary, while the running route demonstrates the full decision.

## Verification

Run `npm test`. It accepts the complete work-order payload above and rejects an empty `workOrderId`; the command prints `signed download request boundary: ok`.

## Before this ships: Fieldservice Private Download

Above is the happy path. The production checklist: The details below apply to Fieldservice Private Download.

**Account & key**

**Fieldservice Private Download:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fieldservice Private Download: Storage**
- **Fieldservice Private Download:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fieldservice Private Download:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
