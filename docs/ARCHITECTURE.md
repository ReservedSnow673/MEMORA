# Memora System Architecture

## Overview

Memora is an accessibility-first mobile application that automatically generates AI-powered image captions and embeds them into portable image metadata (XMP, EXIF, IPTC) so screen readers can describe images wherever they are shared.

## Design Principles

1. Accessibility is not optional - screen-reader-first design
2. Offline-first - all core functionality works without network
3. Privacy by default - image data never leaves device except for explicit cloud AI calls
4. User control - every automated action is reversible
5. Resource respectful - never degrade device performance

## System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Settings │ │ Status   │ │ Caption  │ │ Permission       │   │
│  │ Screen   │ │ Dashboard│ │ Editor   │ │ Screens          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      STATE LAYER (Zustand)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Processing   │ │ Preferences  │ │ Sync State           │    │
│  │ Queue        │ │ Store        │ │ Manager              │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Gallery      │ │ Caption      │ │ Metadata             │    │
│  │ Scanner      │ │ Generator    │ │ Manager              │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Background   │ │ Constraint   │ │ Local Database       │    │
│  │ Scheduler    │ │ Monitor      │ │ (SQLite)             │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                    NATIVE BRIDGE LAYER                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ TFLite       │ │ Metadata     │ │ Background Task      │    │
│  │ Runtime      │ │ Read/Write   │ │ Manager              │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      PLATFORM LAYER                              │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │ iOS                     │ │ Android                      │   │
│  │ - CoreML/TFLite         │ │ - TFLite                     │   │
│  │ - CGImageSource/Dest    │ │ - ExifInterface              │   │
│  │ - BGTaskScheduler       │ │ - WorkManager                │   │
│  │ - Photos Framework      │ │ - MediaStore                 │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Background Task Scheduler Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULER CONTROLLER                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  CONSTRAINT MONITOR                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │ Battery │ │ Charging│ │ Network │ │ Thermal State   │ │  │
│  │  │ Level   │ │ State   │ │ Type    │ │ Monitor         │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   WORK QUEUE                               │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │ Pending │ │ Active  │ │ Failed  │ │ Completed       │ │  │
│  │  │ Images  │ │ Batch   │ │ Retry   │ │ Archive         │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                EXECUTION ENGINE                            │  │
│  │  ┌─────────────────┐ ┌─────────────────────────────────┐ │  │
│  │  │ Rate Limiter    │ │ Batch Processor                  │ │  │
│  │  │ (thermal aware) │ │ (interruptible)                  │ │  │
│  │  └─────────────────┘ └─────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Platform Integration:
- iOS: BGTaskScheduler with BGAppRefreshTask (periodic) + BGProcessingTask (long-running)
- Android: WorkManager with Constraints + ForegroundService for active processing
```

## AI Inference Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPTION GENERATOR                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MODEL SELECTOR (User Preference)              │  │
│  │                                                            │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │ On-Device   │ │ Gemini      │ │ GPT-5.2             │ │  │
│  │  │ (Primary)   │ │ (Fallback)  │ │ (Optional)          │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 INFERENCE ABSTRACTION                      │  │
│  │                                                            │  │
│  │  interface CaptionGenerator {                              │  │
│  │    generateCaption(imageUri: string): Promise<Result>      │  │
│  │    isAvailable(): boolean                                  │  │
│  │    getModelInfo(): ModelInfo                               │  │
│  │  }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

On-Device Pipeline:
1. Load image from URI
2. Resize to 384x384 pixels
3. Normalize pixel values (ImageNet mean/std)
4. Run TFLite inference (BLIP-base quantized)
5. Decode output tokens to text
6. Post-process caption (trim, capitalize, remove artifacts)

Cloud Pipeline (Gemini/GPT-5.2):
1. Load image from URI
2. Encode as base64
3. Send to API with accessibility-focused prompt
4. Parse response
5. Handle errors with retry/fallback logic
```

## Metadata Read/Write Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   METADATA MANAGER                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    READER                                  │  │
│  │                                                            │  │
│  │  Priority Order (check until found):                       │  │
│  │  1. XMP dc:description                                     │  │
│  │  2. EXIF ImageDescription                                  │  │
│  │  3. IPTC Caption-Abstract                                  │  │
│  │                                                            │  │
│  │  Returns: { hasCaption: boolean, caption?: string,         │  │
│  │             source?: 'xmp' | 'exif' | 'iptc' }             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    WRITER                                  │  │
│  │                                                            │  │
│  │  Write Order (all applicable):                             │  │
│  │  1. XMP dc:description (priority - richest support)        │  │
│  │  2. EXIF ImageDescription (widest compatibility)           │  │
│  │  3. IPTC Caption-Abstract (journalism/professional)        │  │
│  │                                                            │  │
│  │  Validation: Re-read after write to confirm persistence   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Platform Implementation:                                        │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │ iOS Native Module       │ │ Android Native Module        │   │
│  │ - CGImageSource         │ │ - ExifInterface (EXIF)       │   │
│  │ - CGImageDestination    │ │ - Apache Commons Imaging     │   │
│  │ - Supports all formats  │ │   (XMP/IPTC)                 │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Backend API Architecture (Optional - Offline Sync)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND                               │
│                                                                  │
│  Endpoints:                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/sync/pull     - Fetch changes since timestamp   │  │
│  │ POST /api/sync/push     - Upload local changes            │  │
│  │ GET  /api/preferences   - Get user preferences            │  │
│  │ PUT  /api/preferences   - Update preferences              │  │
│  │ POST /api/errors/log    - Log AI/processing errors        │  │
│  │ GET  /api/health        - Health check                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Middleware:                                                     │
│  - Device authentication (device_id based, no user accounts)    │
│  - Rate limiting                                                 │
│  - Request validation                                            │
│  - Error handling                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### PostgreSQL (Backend - Optional Sync)

```sql
-- Device registration (no user accounts for privacy)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(10) NOT NULL, -- 'ios' or 'android'
    created_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP
);

-- Processing state sync
CREATE TABLE processing_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    image_hash VARCHAR(64) NOT NULL, -- SHA256 of image content
    status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    caption TEXT,
    model_used VARCHAR(20), -- 'on-device', 'gemini', 'gpt-5.2'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, image_hash)
);

-- Caption history for audit/rollback
CREATE TABLE caption_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    image_hash VARCHAR(64) NOT NULL,
    caption TEXT NOT NULL,
    model_used VARCHAR(20) NOT NULL,
    was_manual_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE preferences (
    device_id UUID PRIMARY KEY REFERENCES devices(id),
    background_enabled BOOLEAN DEFAULT TRUE,
    ai_mode VARCHAR(20) DEFAULT 'on-device', -- 'on-device', 'gemini', 'gpt-5.2'
    auto_process_new BOOLEAN DEFAULT TRUE,
    process_existing BOOLEAN DEFAULT FALSE,
    wifi_only BOOLEAN DEFAULT TRUE,
    charging_only BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Error logs for debugging
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sync queries
CREATE INDEX idx_processing_state_device_updated 
    ON processing_state(device_id, updated_at);
CREATE INDEX idx_caption_history_device_created 
    ON caption_history(device_id, created_at);
CREATE INDEX idx_error_logs_device_created 
    ON error_logs(device_id, created_at);
```

### SQLite (Mobile - Local Storage)

```sql
-- Local processing queue
CREATE TABLE processing_queue (
    id TEXT PRIMARY KEY,
    asset_id TEXT UNIQUE NOT NULL,
    asset_uri TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    caption TEXT,
    model_used TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Local preferences (single row)
CREATE TABLE preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    background_enabled INTEGER DEFAULT 1,
    ai_mode TEXT DEFAULT 'on-device',
    auto_process_new INTEGER DEFAULT 1,
    process_existing INTEGER DEFAULT 0,
    wifi_only INTEGER DEFAULT 1,
    charging_only INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);

-- Sync metadata
CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_pull_at INTEGER,
    last_push_at INTEGER,
    pending_push INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_queue_status ON processing_queue(status);
CREATE INDEX idx_queue_updated ON processing_queue(updated_at);
```

## Security and Privacy Boundaries

### Data Flow Rules

1. **Image pixels never leave device** except when:
   - User explicitly selects Gemini or GPT-5.2 mode
   - Image is encoded as base64 and sent to respective API
   - No caching of images on cloud services

2. **No user accounts required**
   - Device identified by random UUID
   - No personal information collected
   - Backend sync is optional and privacy-preserving

3. **Local storage encryption**
   - SQLite database uses platform encryption
   - No sensitive data stored in plaintext

4. **Network security**
   - All API calls over HTTPS
   - API keys stored in secure storage (Keychain/Keystore)
   - Certificate pinning for cloud AI endpoints

### Permission Boundaries

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| Photo Library | Read images, write metadata | On first launch |
| Background App Refresh | Run scheduled tasks | After onboarding |
| Network | Cloud AI fallback | When selecting cloud AI mode |

### Audit Trail

- All caption changes logged with timestamp and model used
- User can view history of changes per image
- Manual edits marked distinctly from AI-generated
