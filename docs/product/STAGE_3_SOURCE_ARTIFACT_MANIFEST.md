# Stage 3 Source Artifact Manifest

- **Status:** VERIFIED METADATA; CONTROLLED ARCHIVE — `OWNER ACTION REQUIRED`
- **Verified:** 2026-08-10
- **Source owner:** Damian
- **Confidentiality:** private owner source; authorized contractors only; do not add the DOCX files to GitHub

| Full filename | SHA-256 | Interpretation result |
| --- | --- | --- |
| `04_Studio-Las_Ankiety-i-brief-AI_v2.docx` | `66b495053e72d8f742b6bcc6dc1b2c40ff473752e0e8315da1e51b25607be785` | 26 core questions and four conditional modules |
| `03_Studio-Las_Proces-klienta-i-PWD_v2.docx` | `8ecc7addbb38002c51c9424e91bbe0dde61ecc091ab812b9c5d1ef50094203fc` | Seven observation domains are guidance categories, not seven mandatory tests |

## Integrity verification

An authorized contractor recomputes each hash without opening or copying content into Git:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '<authorized-local-copy.docx>'
```

Compare the complete lowercase hexadecimal value with this manifest. A mismatch fails closed and requires a new owner verification record; it must not be silently accepted.

## Authorized access procedure

1. Ask Damian for explicit, purpose-bound access to the named source.
2. Damian supplies an authorized local copy through a controlled private channel.
3. Recompute SHA-256 and compare it with this manifest before use.
4. Work from the minimum necessary content and do not upload the source, extracted health content, or a personal filesystem path to GitHub.
5. Remove the contractor copy according to Damian's instruction after the bounded task.

No controlled source archive has been identified in repository evidence. Canonical storage location and access owner therefore remain `OWNER ACTION REQUIRED`. This is a provenance/operational continuity gap; it does not invalidate the verified hashes or the 26+4 interpretation, but it blocks any claim that another authorized contractor can independently retrieve the originals today.

The personal path used during recovery is intentionally not recorded as canonical storage.
