# Creator claim operations

The public claim entry point is `/claim`. New creator accounts return to `/claim/profile` and do not enter brand-workspace onboarding.

## Instagram public-data enrichment

This integration is called only from `creatorClaims:start`; Discovery imports and other creator jobs do not use it.

Set these Convex environment variables before enabling public claims:

- `APIFY_API_TOKEN`: required Apify API token. It is sent as a bearer header and never placed in the URL.
- `APIFY_CREATOR_CLAIM_ACTOR_ID`: optional Actor ID. Defaults to the Apify-maintained `apify~instagram-profile-scraper`.
- `APIFY_CREATOR_CLAIM_INCLUDE_ABOUT`: optional `true` to request Apify's paid About-profile data, including country when Instagram exposes it.

Creatorly calls Apify's synchronous Actor endpoint with this input:

```json
{
  "usernames": ["creator"],
  "includeAboutSection": false
}
```

Creatorly maps Apify's `fullName`, `biography`, `followersCount`, `followsCount`, `postsCount`, `businessCategoryName`, `externalUrl`, `profilePicUrlHD`, `verified`, `private`, `isBusinessAccount`, and recent post interactions. Recent engagement is calculated as average likes plus comments divided by followers. The response username must exactly match the claimed handle.

If the token is absent, Apify errors, or it returns a different profile, enrichment is marked failed and the creator can continue manually. Instagram OAuth and the Meta API are not used.

## Review flow

Claims move through `draft → ready_for_verification → verification_pending → review_required → published`. Admins review claims in the existing admin page and can approve, reject, or request changes. Approval merges an exact Instagram handle into the canonical creator record and only publishes the contact route chosen by the creator.

Ownership proof is manually reviewed in this release. Do not enable automatic approval until the bio-code, business-email, and website checks have server-side verification and abuse limits.

## Private files

Media kits and audience screenshots use Convex private storage URLs. Owners and admins access them through authenticated functions; no public file route is created. Limits are one PDF up to 20 MB and ten JPG, PNG, or WebP screenshots up to 8 MB each.

## Release gate

Before public launch:

- Configure and test the Apify token against a known public profile.
- Test all three proof methods with known creators.
- Confirm admin review coverage and response time.
- Add per-user, per-handle, and per-IP claim rate limits.
- Add malware scanning for uploaded files.
- Update privacy terms for submitted contacts, screenshots, retention, and deletion.
