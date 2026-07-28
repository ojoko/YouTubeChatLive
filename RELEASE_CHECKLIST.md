# KomeFlow release checklist

## Repository

- [ ] Review all local changes.
- [ ] Choose and add a software license.
- [ ] Commit version `1.7.0`.
- [ ] Push the release commit to GitHub.
- [ ] Confirm `README.md` and `PRIVACY.md` are publicly accessible.
- [ ] Create a Git tag and GitHub release if desired.

## Functional QA

- [ ] Live position: new comments flow immediately.
- [ ] DVR: consent is required before local storage begins.
- [ ] DVR: comments replay after a 30-second rewind.
- [ ] DVR: “Disable DVR and delete saved comments” succeeds.
- [ ] Archived chat replay displays comments.
- [ ] Chat-disabled and members-only streams fail gracefully.
- [ ] Sidebar open, closed, theater mode, and fullscreen.
- [ ] SPA navigation between two YouTube videos.
- [ ] Multiple YouTube tabs.
- [ ] English, Japanese, Korean, Simplified Chinese, and Traditional Chinese popup layouts.

## Chrome Web Store account

- [ ] Developer registration fee paid.
- [ ] Publisher name and contact email completed.
- [ ] Contact email verified.
- [ ] Two-step verification enabled.

## Store listing

- [ ] Upload `store-assets/store-icon-128.png`.
- [ ] Upload both 1280×800 screenshots.
- [ ] Upload `store-assets/small-promo-440x280.png`.
- [ ] Optionally upload `store-assets/marquee-1400x560.png`.
- [ ] Enter localized listing text from `STORE_LISTING.md`.
- [ ] Select a category.
- [ ] Add homepage, support, and privacy policy URLs.
- [ ] Confirm all screenshots and copy avoid implying YouTube affiliation.

## Privacy practices

- [ ] Enter the single-purpose statement from `STORE_LISTING.md`.
- [ ] Justify `storage` and `youtube.com` access.
- [ ] Declare that no remote code is used.
- [ ] Disclose locally processed website/user-generated content.
- [ ] Certify Limited Use compliance.
- [ ] Confirm the dashboard disclosure exactly matches `PRIVACY.md`.

## Package and submission

- [ ] Run `scripts/package.ps1`.
- [ ] Confirm the ZIP contains `manifest.json` at its root.
- [ ] Load the packaged files as an unpacked extension for a final smoke test.
- [ ] Upload the ZIP to the developer dashboard.
- [ ] Use deferred publishing for the first review if a controlled launch is preferred.
