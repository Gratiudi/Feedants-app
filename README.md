# Feedants Competition Details — Schema & State Design

## MVP assumptions and scope

This project is built as a pragmatic MVP for a competition platform, not a full production admin system.

- Competition browsing and detail pages are in scope.
- Registration and submission flows are in scope.
- Result display is in scope.
- A dedicated admin dashboard is not built out here; instead, a lightweight results endpoint is exposed for manual winner upload with an `X-Admin-Secret` header.
- Real auth is intentionally out of scope for this version. In production, this would be replaced with proper judge/admin role-based authentication.
- File uploads are represented as `fileUrl` / `mediaUrl` strings for the assignment. For a production deployment, a storage solution such as Cloudinary or local disk storage can be added.

## Entities: Competition, Judge, User, Registration, Submission, Result

---

## Judge
Separate entity since judges are likely reused across multiple competitions.

Fields:
- name
- title
- bio
- photoUrl
- introVideoUrl
- yearsOfExperience
- createdAt / updatedAt

---

## Competition
Represents a single competition (e.g. "Feedants Classical Dance").

Fields:
- title
- description
- tags: []  (e.g. ["Dance", "Multi-Win"])
- judgeId (ref to Judge)
- prizePool
- entryFee
- totalSpots
- spotsBooked            // incremented atomically on registration
- registerBefore
- submissionStart
- submissionEnd
- resultDate
- rewards: [{ position, amount }]
- judgingParameters
- rulesAndEligibility
- refundPolicy
- createdAt / updatedAt   // audit/bookkeeping only — not shown in UI directly;
                          // useful for sorting/debugging (e.g. "newest competitions first")

### Computed (not stored) — derived per request from date fields:
A plain function runs on every read, using the current server time. Nothing
is persisted — this guarantees status is always accurate and never drifts
out of sync (a stored "status" field could go stale under concurrent load).

```js
function deriveCompetitionStatus(competition, now = new Date()) {
  const registrationStatus =
    now <= competition.registerBefore && competition.spotsBooked < competition.totalSpots
      ? 'open'
      : 'closed';

  const submissionStatus =
    now < competition.submissionStart ? 'not_started'
    : now <= competition.submissionEnd ? 'open'
    : 'closed';

  return { registrationStatus, submissionStatus };
}
```

Registration and submission windows can overlap (per design: submissions
start Aug 6, registration closes Aug 10) — tracked as two independent
flags, not one linear competition-wide state.

resultStatus ("pending" | "announced") is derived by checking whether a
Result document exists for this competition AND now >= resultDate.

---

## User
- name, email, phone, photoUrl
- referralCode

---

## Registration
Join table: one per (user, competition).
- userId
- competitionId
- registeredAt
- **unique compound index on (userId, competitionId)** — prevents duplicate registration

### Per-user derived state
Not a field on User or Registration — computed as a function of
(userId, competitionId), sourced by querying Registration, Submission,
and Result together:

```js
async function getUserCompetitionState(userId, competitionId) {
  const registration = await Registration.findOne({ userId, competitionId });
  if (!registration) return { registrationStatus: 'not_registered' };

  const submission = await Submission.findOne({ userId, competitionId });
  const submissionStatus = submission ? 'submitted' : 'not_submitted';

  let resultStatus = 'pending';
  const won = await Result.findOne({ competitionId, 'winners.userId': userId });
  if (won) resultStatus = 'won';
  else {
    const announced = await Result.findOne({ competitionId });
    if (announced) resultStatus = 'lost';
  }

  return { registrationStatus: 'registered', submissionStatus, resultStatus };
}
```

These three flags are independent, not a single enum — avoids invalid
combinations like "won" + "not_submitted".

---

## Submission
- userId
- registrationId
- competitionId   // denormalized from Registration for fast indexed lookups
                   // (e.g. "all submissions for competition X" is a hot query
                   // for judges/admins — avoids a join through Registration
                   // at scale). Deliberate trade-off, noted here explicitly.
- fileUrl / mediaUrl
- submittedAt

### Validation
Not a schema property — enforced in the request handler at submission time:

```js
async function handleSubmission(req, res) {
  const { userId, competitionId } = req.body;
  const competition = await Competition.findById(competitionId);
  const { submissionStatus } = deriveCompetitionStatus(competition);

  if (submissionStatus !== 'open') return res.status(400).json({ error: 'Submissions closed' });

  const registration = await Registration.findOne({ userId, competitionId });
  if (!registration) return res.status(403).json({ error: 'Not registered' });

  // proceed to create Submission doc
}
```

---

## Result
- competitionId
- winners: [{ userId, position, prizeAwarded }]
- announcedAt

### How winners are assigned
Judging is subjective (a dance video, not a scorable metric) — no automated
scoring exists in this design. Assumption: an admin/organizer submits the
final ranked list via an admin-only endpoint (e.g. `POST /competitions/:id/results`)
once offline judging is complete, typically around resultDate. This creates
the Result document; the frontend shows results once
`now >= resultDate AND a Result doc exists for that competition`.

---

## Bottom CTA button — derived from the flags above
| registrationStatus | submissionStatus (window) | user submitted? | resultStatus | Button shows |
|---|---|---|---|---|
| open | — | — | — | "Register" |
| closed, not registered | — | — | — | "Registration Closed" |
| registered | not_started | — | — | "Submission opens soon" |
| registered | open | not submitted | — | "Upload Submission" |
| registered | open | submitted | — | "Submitted — Registered" |
| registered | closed | — | pending | "Awaiting Results" |
| registered | closed | — | announced | "View Results" (Won/Lost) |

---

## Concurrency note
Spot booking uses an atomic conditional update to prevent overbooking under
concurrent registration requests:

```js
Competition.findOneAndUpdate(
  { _id, spotsBooked: { $lt: totalSpots } },
  { $inc: { spotsBooked: 1 } },
  { new: true }
)
```

If it returns null, spots are full and the request is rejected.
