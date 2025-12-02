# GitHub Issue: Enhancement - Evaluate rsync for CFEx bulk transfer

**Create at:** https://github.com/elevanaltd/ingest-assistant/issues/new

---

## Title

Enhancement: Evaluate rsync for CFEx bulk transfer

## Labels

`enhancement`

## Body

### Summary

Evaluate replacing the current streaming file transfer implementation with `rsync` for CFEx card transfers.

### Context

The current `transferFile()` in `cfexTransfer.ts` uses Node.js streaming (`createReadStream` → `pipeline` → `createWriteStream`). While this provides fine-grained per-file progress, rsync offers several advantages for bulk media transfers.

### rsync Advantages

| Aspect | Current (streaming) | rsync |
|--------|---------------------|-------|
| **Timestamps** | Requires manual `fs.utimes()` | ✅ Preserved with `-a` |
| **Permissions** | ❌ Not preserved | ✅ Preserved |
| **Network resilience** | Manual retry logic | Built-in `--partial` |
| **Progress** | Per-file bytes | Overall % via `--info=progress2` |
| **Battle-tested** | Custom implementation | Industry standard |

### Proposed Implementation

```bash
# Photos to LucidLink
rsync -a --info=progress2 \
  --include='*.jpg' --include='*.jpeg' --exclude='*' \
  "/media/card/DCIM/100_FUJI/" \
  "/destination/photos/"

# Videos to Ubuntu
rsync -a --info=progress2 \
  --include='*.mov' --include='*.mp4' --exclude='*' \
  "/media/card/DCIM/100_FUJI/" \
  "/destination/videos/"
```

### Considerations

1. **Dual-destination routing**: Would need two rsync calls (one for photos, one for videos)
2. **Progress UI**: Would show overall % instead of per-file bytes
3. **Post-transfer validation**: EXIF extraction would remain as separate step
4. **External dependency**: rsync is standard on macOS/Linux but not Node.js native

### Acceptance Criteria

- [ ] Benchmark rsync vs current implementation (transfer speed, CPU usage)
- [ ] Prototype progress parsing from `--info=progress2` output
- [ ] Verify all metadata preserved (timestamps, permissions)
- [ ] Test with LucidLink and NFS destinations
- [ ] Evaluate error handling granularity (batch vs per-file)

### Priority

LOW - Current implementation works, timestamp issue addressed via `fs.utimes()`

### References

- Current implementation: `electron/services/cfexTransfer.ts`
- rsync man page: https://linux.die.net/man/1/rsync
