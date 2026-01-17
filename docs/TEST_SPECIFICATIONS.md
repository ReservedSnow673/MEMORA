# Memora Test Specifications

## Testing Strategy

- Test-first development: Write tests before implementation
- All tests must pass before feature is considered complete
- Edge cases are mandatory, not optional
- Accessibility tests are first-class citizens

## Test Categories

1. **Unit Tests**: Individual functions and classes
2. **Integration Tests**: Component interactions
3. **Edge Case Tests**: Failure scenarios and boundary conditions
4. **Accessibility Tests**: Screen reader compatibility
5. **Performance Tests**: Resource usage and timing

---

## F1: Permission Management Tests

### T1.1.1: Request Permission

```typescript
describe('PhotoPermission.request', () => {
  it('should return granted when user approves full access')
  it('should return limited when user selects limited photos (iOS 14+)')
  it('should return denied when user denies access')
  it('should return blocked when permission previously denied')
  it('should not re-prompt if already granted')
})
```

### T1.1.2: Handle Limited Access

```typescript
describe('PhotoPermission.handleLimited', () => {
  it('should detect limited access state on iOS 14+')
  it('should prompt user to grant full access')
  it('should function with only selected photos')
  it('should track which photos are accessible')
})
```

### T1.1.3: Handle Denial

```typescript
describe('PhotoPermission.handleDenial', () => {
  it('should show settings deep link on denial')
  it('should disable scanning features when denied')
  it('should re-check permission when app returns from settings')
})
```

### T1.1.4: Handle Revocation (Edge Case)

```typescript
describe('PhotoPermission.handleRevocation', () => {
  it('should detect permission revocation during background scan')
  it('should pause processing immediately on revocation')
  it('should persist queue state before stopping')
  it('should notify user of permission loss')
  it('should resume gracefully when permission restored')
})
```

---

## F2: Gallery Scanning Tests

### T2.1.1: Paginated Asset Fetch

```typescript
describe('GalleryScanner.fetchAssets', () => {
  it('should fetch first batch of 100 assets')
  it('should use cursor for subsequent pages')
  it('should handle empty gallery gracefully')
  it('should complete when all assets fetched')
  it('should yield control between batches to prevent blocking')
})
```

### T2.1.2: Track Scan Progress

```typescript
describe('GalleryScanner.trackProgress', () => {
  it('should persist last scanned timestamp')
  it('should resume from last position after app restart')
  it('should handle timestamp in future gracefully')
})
```

### T2.1.3: New Photo Detection

```typescript
describe('GalleryScanner.detectNewPhotos', () => {
  it('should find photos added since last scan')
  it('should handle photos with creation date before scan but added after')
  it('should not duplicate already-processed photos')
})
```

### T2.1.4: Filter Supported Formats

```typescript
describe('GalleryScanner.filterFormats', () => {
  it('should accept JPEG images')
  it('should accept HEIC images')
  it('should accept PNG images')
  it('should accept WebP images')
  it('should reject video files')
  it('should reject RAW formats') // Future consideration
  it('should handle unknown media types gracefully')
})
```

### Edge Cases: Gallery Scanning

```typescript
describe('GalleryScanner.edgeCases', () => {
  it('should handle gallery with 50,000+ images without OOM')
  it('should handle corrupt asset that crashes on access')
  it('should handle asset deleted mid-scan')
  it('should handle iCloud photos not downloaded')
  it('should handle photos with no creation date')
  it('should timeout individual asset access after 5 seconds')
})
```

---

## F3: AI Caption Generation Tests

### T3.1.1: Model Initialization (On-Device)

```typescript
describe('TFLiteModel.initialize', () => {
  it('should load model file successfully')
  it('should complete warmup inference')
  it('should report available after initialization')
  it('should handle missing model file')
  it('should handle corrupt model file')
  it('should handle insufficient memory for model')
})
```

### T3.1.2: Image Preprocessing

```typescript
describe('TFLiteModel.preprocess', () => {
  it('should resize image to 384x384')
  it('should normalize pixel values to [-1, 1]')
  it('should handle portrait orientation')
  it('should handle landscape orientation')
  it('should handle square images')
  it('should preserve aspect ratio with padding')
  it('should handle HEIC format conversion')
})
```

### T3.1.3: Inference Execution

```typescript
describe('TFLiteModel.inference', () => {
  it('should generate caption within 5 seconds')
  it('should handle memory pressure during inference')
  it('should be interruptible')
  it('should release resources after inference')
})
```

### T3.1.4: Output Decoding

```typescript
describe('TFLiteModel.decode', () => {
  it('should convert tokens to readable text')
  it('should capitalize first letter')
  it('should remove trailing artifacts')
  it('should handle empty output')
  it('should truncate overly long captions to 200 chars')
})
```

### T3.1.5: On-Device Error Handling

```typescript
describe('TFLiteModel.errors', () => {
  it('should timeout after 30 seconds')
  it('should catch and report OOM errors')
  it('should fallback to cloud when model unavailable')
  it('should retry once on transient failure')
})
```

### T3.2: Gemini Cloud Fallback

```typescript
describe('GeminiProvider', () => {
  it('should encode image as base64 under 4MB')
  it('should compress image if over 4MB')
  it('should send request with correct headers')
  it('should parse successful response')
  it('should retry 3 times with exponential backoff')
  it('should handle 429 rate limit with longer backoff')
  it('should handle 500 server error')
  it('should timeout after 30 seconds')
  it('should handle network disconnection mid-request')
  it('should handle malformed JSON response')
  it('should handle content policy rejection')
})
```

### T3.3: GPT-5.2 Optional Path

```typescript
describe('OpenAIProvider', () => {
  it('should use Responses API endpoint')
  it('should set reasoning.effort to none')
  it('should set text.verbosity to low')
  it('should encode image correctly')
  it('should extract output_text from response')
  it('should handle rate limits gracefully')
  it('should handle invalid API key')
  it('should handle quota exceeded')
})
```

### T3.4: Model Switching

```typescript
describe('ModelSelector', () => {
  it('should return on-device provider when selected')
  it('should return Gemini provider when selected')
  it('should return OpenAI provider when selected')
  it('should switch providers without restart')
  it('should fallback through chain on failure')
  it('should skip unavailable providers in chain')
})
```

### Edge Cases: AI Generation

```typescript
describe('CaptionGenerator.edgeCases', () => {
  it('should handle completely black image')
  it('should handle completely white image')
  it('should handle very small image (10x10)')
  it('should handle very large image (8000x6000)')
  it('should handle image with no discernible content')
  it('should handle image with text only')
  it('should handle image with faces (privacy consideration)')
  it('should handle animated GIF (first frame)')
  it('should handle image with EXIF rotation')
})
```

---

## F4: Metadata Embedding Tests

### T4.1.1: XMP Writing

```typescript
describe('MetadataWriter.writeXMP', () => {
  it('should write dc:description field')
  it('should preserve existing XMP fields')
  it('should handle images without XMP')
  it('should handle UTF-8 special characters')
  it('should handle very long captions (500+ chars)')
})
```

### T4.1.2: EXIF Writing

```typescript
describe('MetadataWriter.writeEXIF', () => {
  it('should write ImageDescription field')
  it('should preserve existing EXIF fields')
  it('should handle images without EXIF')
  it('should truncate to EXIF length limits')
})
```

### T4.1.3: IPTC Writing

```typescript
describe('MetadataWriter.writeIPTC', () => {
  it('should write Caption-Abstract field')
  it('should preserve existing IPTC fields')
  it('should handle images without IPTC')
  it('should encode correctly for IPTC charset')
})
```

### T4.1.4: Atomic Writes

```typescript
describe('MetadataWriter.atomicWrite', () => {
  it('should write to temp file first')
  it('should validate temp file before replacing')
  it('should rollback on validation failure')
  it('should handle disk full error')
  it('should handle read-only file')
  it('should handle file deleted during write')
})
```

### T4.2: Write Validation

```typescript
describe('MetadataWriter.validate', () => {
  it('should confirm caption readable after write')
  it('should verify image dimensions unchanged')
  it('should verify file size reasonable')
  it('should detect silent write failure')
})
```

### Edge Cases: Metadata

```typescript
describe('MetadataWriter.edgeCases', () => {
  it('should handle HEIC with no metadata support')
  it('should handle PNG with tEXt chunk')
  it('should handle image with corrupt metadata section')
  it('should handle image with partial XMP')
  it('should handle image with conflicting metadata')
  it('should handle metadata in wrong encoding')
  it('should preserve GPS and other sensitive EXIF')
  it('should handle file locked by another process')
})
```

---

## F5: Background Scheduler Tests

### T5.1: Constraint Monitoring

```typescript
describe('ConstraintMonitor', () => {
  describe('battery', () => {
    it('should detect battery level above threshold')
    it('should detect battery level below threshold')
    it('should detect low power mode')
    it('should update on battery change')
  })
  
  describe('charging', () => {
    it('should detect charging state')
    it('should detect unplugged state')
    it('should update on plug/unplug')
  })
  
  describe('network', () => {
    it('should detect Wi-Fi connection')
    it('should detect cellular connection')
    it('should detect no connection')
    it('should update on network change')
  })
  
  describe('thermal', () => {
    it('should detect nominal thermal state')
    it('should detect elevated thermal state')
    it('should detect critical thermal state')
    it('should throttle on elevated state')
    it('should stop on critical state')
  })
})
```

### T5.2: Task Scheduling

```typescript
describe('BackgroundScheduler', () => {
  it('should register background task on app launch')
  it('should schedule task for 15 minutes (iOS minimum)')
  it('should only execute when all constraints met')
  it('should skip execution when constraints not met')
  it('should re-schedule after execution')
  it('should handle task expiration gracefully')
})
```

### T5.3: Execution Control

```typescript
describe('ExecutionController', () => {
  it('should process queue in priority order')
  it('should limit batch size based on thermal state')
  it('should pause when user requests')
  it('should resume when user requests')
  it('should stop immediately when requested')
  it('should save state before stopping')
  it('should resume from saved state')
})
```

### Edge Cases: Background Scheduler

```typescript
describe('BackgroundScheduler.edgeCases', () => {
  it('should handle app terminated during processing')
  it('should handle device reboot')
  it('should handle time zone change')
  it('should handle daylight saving transition')
  it('should handle system clock manipulation')
  it('should handle constraint change mid-batch')
  it('should handle queue corruption')
  it('should handle 10,000+ pending items')
  it('should not exceed 30 second iOS execution limit')
})
```

---

## F6: User Interface Tests

### T6.1: Settings Screen

```typescript
describe('SettingsScreen', () => {
  it('should render all toggles')
  it('should load current preferences')
  it('should save preference on toggle')
  it('should show AI mode options')
  it('should update AI mode on selection')
  it('should disable cloud options without network')
})
```

### T6.2: Status Dashboard

```typescript
describe('StatusDashboard', () => {
  it('should show total image count')
  it('should show processed count')
  it('should show pending count')
  it('should show failed count')
  it('should show current status')
  it('should update in real-time')
  it('should allow retry of failed images')
})
```

### T6.3: Caption Editor

```typescript
describe('CaptionEditor', () => {
  it('should display image')
  it('should show current caption')
  it('should allow editing caption')
  it('should save edited caption')
  it('should cancel without saving')
  it('should show caption history')
})
```

### T6.4: Accessibility Tests

```typescript
describe('Accessibility', () => {
  describe('screen reader', () => {
    it('should have accessibilityLabel on all interactive elements')
    it('should have accessibilityRole on all elements')
    it('should have accessibilityHint where needed')
    it('should announce navigation changes')
    it('should announce status updates')
    it('should have logical focus order')
  })
  
  describe('dynamic content', () => {
    it('should announce processing start')
    it('should announce processing complete')
    it('should announce errors')
    it('should announce progress milestones')
  })
  
  describe('controls', () => {
    it('should have minimum touch target 44x44')
    it('should support dynamic type')
    it('should support reduced motion')
    it('should support bold text')
  })
})
```

---

## F7: Local Storage Tests

```typescript
describe('LocalDatabase', () => {
  describe('processingQueue', () => {
    it('should insert new item')
    it('should update item status')
    it('should fetch pending items')
    it('should fetch failed items')
    it('should delete completed items older than 30 days')
    it('should handle database corruption')
    it('should handle disk full')
  })
  
  describe('preferences', () => {
    it('should save preferences')
    it('should load preferences')
    it('should provide defaults when empty')
    it('should migrate schema on upgrade')
  })
})
```

---

## F8: Backend Sync Tests

```typescript
describe('SyncEngine', () => {
  describe('pull', () => {
    it('should fetch changes since timestamp')
    it('should apply remote changes locally')
    it('should handle empty response')
    it('should handle network failure')
    it('should handle malformed response')
  })
  
  describe('push', () => {
    it('should upload local changes')
    it('should mark pushed items as synced')
    it('should retry on failure')
    it('should handle conflict')
  })
})
```

---

## Performance Tests

```typescript
describe('Performance', () => {
  it('should scan 1000 images in under 30 seconds')
  it('should not exceed 100MB memory during batch processing')
  it('should not block main thread for more than 16ms')
  it('should complete on-device inference in under 5 seconds')
  it('should write metadata in under 1 second per image')
})
```

---

## Integration Tests

```typescript
describe('Integration', () => {
  describe('full pipeline', () => {
    it('should scan image, generate caption, write metadata, update queue')
    it('should handle pipeline failure at any stage')
    it('should retry failed stages independently')
  })
  
  describe('background to foreground', () => {
    it('should continue processing when app foregrounded')
    it('should show accurate status after background work')
  })
  
  describe('offline to online', () => {
    it('should queue cloud requests when offline')
    it('should process queue when online')
    it('should sync to backend when available')
  })
})
```
