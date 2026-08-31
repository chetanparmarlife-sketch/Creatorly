# Creator-Owned Profile Images Spec

Creatorly must stop depending on profile pictures served from the private
production source configured in Convex. Copy every reachable external
profile picture into the production Convex deployment's file storage, retain
the Convex storage ID on the creator record, and serve the Convex-owned URL
through the existing `profileImageUrl` field.

The migration must be resumable, must never replace a working source URL until
its copy succeeds, must accept only the known source bucket, and must cap image
size and MIME type. A failed image remains on its existing URL for a later retry.
Only one migration chain may run at a time. Progress and failure counts must be
observable without exposing source URLs.

The existing discovery UI must continue using `profileImageUrl`, with initials
as its error fallback. No creator, contact, metric, or unlock data may be deleted.
