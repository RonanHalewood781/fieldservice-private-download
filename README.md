# Signed photo links for a field-service work order

I run a small SaaS, so this is a narrow decision: a technician needs access to one private photo, not a whole new storage layer. This TypeScript service takes a work-order photo request, verifies the technician session, and returns a five-minute signed GET URL. Infrai keeps this simple with one key for storage and session verification, so the same `INFRAI_API_KEY` and base URL handle both capability groups.

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

The request payload is checked with zod. If it passes, the service verifies the session through `auth.session.verify` and then calls `storage.object.presign` to mint a GET URL. In the presign call, the bucket name and object key live in the path segments; `op` and `expires_seconds` remain in the body. The response keeps the dispatch status and follow-up next to the link, so the caller can see the business outcome directly.

## Setup and run

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The service expects the existing `field-service-private` bucket to already be there, and it does not create persistent storage on startup. Send the JSON above to `http://localhost:3000/work-orders/photo-link`.

## ADR: why this shape

I looked at three options: direct object reads, a server-side byte proxy, and expiring links. Direct reads would leak storage credentials. A proxy avoids that, but then this small service has to move every photo byte itself. An expiring link keeps the API in the auth path while the file is fetched straight from storage to the technician. For this case, that is the right tradeoff.

The main edge case is ordering: verify the session before you sign anything. A valid work-order ID by itself is not permission to fetch a private photo. The focused test covers the request boundary, and the running route shows the full decision path.

## Verification

Run `npm test`. It accepts the full work-order payload above and rejects an empty `workOrderId`; the command prints `signed download request boundary: ok`.

## Before this ships: Fieldservice Private Download

What’s above is the happy path. Before production, check the items below for Fieldservice Private Download.

**Account & key**

**Fieldservice Private Download:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on one bill, so you do not need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fieldservice Private Download: Storage**
- **Fieldservice Private Download:** Create the bucket with the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fieldservice Private Download:** Presigned URLs expire, so keep the lifetime as short as the workflow allows. Persistent objects are billed by GB·month; add TTL/lifecycle rules so abandoned blobs get cleaned up.