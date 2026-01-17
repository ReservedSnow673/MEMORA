# Memora Feature Breakdown

## Feature Matrix

### F1: Permission Management

#### F1.1: Photo Library Access
| Task | Subtasks |
|------|----------|
| T1.1.1: Request permission | Check current status, show rationale, request access |
| T1.1.2: Handle limited access | iOS 14+ limited photo selection, prompt for full access |
| T1.1.3: Handle denial | Show settings deep link, graceful degradation |
| T1.1.4: Handle revocation | Detect mid-operation revocation, pause processing, notify user |

#### F1.2: Background Execution
| Task | Subtasks |
|------|----------|
| T1.2.1: Register background tasks | iOS BGTaskScheduler, Android WorkManager |
| T1.2.2: Handle background denial | Foreground-only mode, inform user of limitations |

### F2: Gallery Scanning

#### F2.1: Asset Discovery
| Task | Subtasks |
|------|----------|
| T2.1.1: Paginated asset fetch | Batch size 100, cursor-based pagination |
| T2.1.2: Track scan progress | Store last scanned timestamp, resume capability |
| T2.1.3: New photo detection | Monitor for new assets since last scan |
| T2.1.4: Filter supported formats | JPEG, HEIC, PNG, WebP validation |

#### F2.2: Caption Status Detection
| Task | Subtasks |
|------|----------|
| T2.2.1: Read XMP metadata | Extract dc:description |
| T2.2.2: Read EXIF metadata | Extract ImageDescription |
| T2.2.3: Read IPTC metadata | Extract Caption-Abstract |
| T2.2.4: Classify caption quality | Empty, generic (IMG_xxxx), meaningful |

### F3: AI Caption Generation

#### F3.1: On-Device Inference
| Task | Subtasks |
|------|----------|
| T3.1.1: Model initialization | Load TFLite model, warmup inference |
| T3.1.2: Image preprocessing | Resize 384x384, normalize, tensor conversion |
| T3.1.3: Inference execution | Run model, handle memory pressure |
| T3.1.4: Output decoding | Token to text, post-processing |
| T3.1.5: Error handling | Model load failure, inference timeout, OOM |

#### F3.2: Gemini Cloud Fallback
| Task | Subtasks |
|------|----------|
| T3.2.1: API integration | Endpoint setup, authentication |
| T3.2.2: Image encoding | Base64 conversion with size limits |
| T3.2.3: Request execution | Timeout handling, retry logic (3x exponential) |
| T3.2.4: Response parsing | Extract caption, handle errors |
| T3.2.5: Rate limit handling | Backoff, queue throttling |

#### F3.3: GPT-5.2 Optional Path
| Task | Subtasks |
|------|----------|
| T3.3.1: API integration | Responses API setup, authentication |
| T3.3.2: Request configuration | reasoning.effort=none, verbosity=low |
| T3.3.3: Image handling | Base64 encoding, detail level selection |
| T3.3.4: Response parsing | Extract output_text |
| T3.3.5: Error handling | Rate limits, content policy, timeouts |

#### F3.4: Model Switching
| Task | Subtasks |
|------|----------|
| T3.4.1: Preference storage | Persist selected model |
| T3.4.2: Runtime switching | Hot-swap without restart |
| T3.4.3: Fallback chain | on-device -> gemini -> gpt-5.2 -> fail |

### F4: Metadata Embedding

#### F4.1: Caption Writing
| Task | Subtasks |
|------|----------|
| T4.1.1: XMP writing | dc:description embedding |
| T4.1.2: EXIF writing | ImageDescription field |
| T4.1.3: IPTC writing | Caption-Abstract field |
| T4.1.4: Atomic writes | Temp file -> validate -> replace |

#### F4.2: Write Validation
| Task | Subtasks |
|------|----------|
| T4.2.1: Re-read verification | Confirm caption persisted |
| T4.2.2: Format preservation | Ensure image quality unchanged |
| T4.2.3: Export simulation | Verify caption survives share |

### F5: Background Scheduler

#### F5.1: Constraint Monitoring
| Task | Subtasks |
|------|----------|
| T5.1.1: Battery monitoring | Level threshold (>20%), low power mode |
| T5.1.2: Charging detection | Plugged in state |
| T5.1.3: Network monitoring | Wi-Fi vs cellular, connectivity |
| T5.1.4: Thermal monitoring | iOS thermal state, Android thermal API |

#### F5.2: Task Scheduling
| Task | Subtasks |
|------|----------|
| T5.2.1: Periodic scheduling | 15-min minimum interval (iOS), flexible (Android) |
| T5.2.2: Constraint-based execution | Only run when all conditions met |
| T5.2.3: Work queue management | Priority ordering, batch sizing |
| T5.2.4: Interruption handling | Save state, resume capability |

#### F5.3: Execution Control
| Task | Subtasks |
|------|----------|
| T5.3.1: Rate limiting | Thermal-aware throttling |
| T5.3.2: Pause/resume | User-triggered, constraint-triggered |
| T5.3.3: Stop processing | Immediate halt, queue preservation |

### F6: User Interface

#### F6.1: Settings Screen
| Task | Subtasks |
|------|----------|
| T6.1.1: Background toggle | Enable/disable background scanning |
| T6.1.2: AI mode selector | Radio: on-device / Gemini / GPT-5.2 |
| T6.1.3: Auto-process toggle | New images automatic processing |
| T6.1.4: Existing images toggle | Process library retroactively |
| T6.1.5: Scheduling options | Wi-Fi only, charging only toggles |
| T6.1.6: Accessibility compliance | All controls screen-reader compatible |

#### F6.2: Status Dashboard
| Task | Subtasks |
|------|----------|
| T6.2.1: Statistics display | Total, processed, pending, failed counts |
| T6.2.2: Current status | Idle, processing, paused indicators |
| T6.2.3: Failed image list | Show failures with retry option |
| T6.2.4: Progress indicator | Current batch progress |

#### F6.3: Caption Editor
| Task | Subtasks |
|------|----------|
| T6.3.1: Image display | Show image with current caption |
| T6.3.2: Caption editing | Editable text input |
| T6.3.3: Save/cancel actions | Persist changes or discard |
| T6.3.4: History view | Show previous captions |

#### F6.4: Accessibility
| Task | Subtasks |
|------|----------|
| T6.4.1: Screen reader labels | All elements have accessibilityLabel |
| T6.4.2: Roles and hints | Proper accessibilityRole, accessibilityHint |
| T6.4.3: Focus management | Logical focus order, announcements |
| T6.4.4: Dynamic content | Live region updates for status changes |

### F7: Local Storage

#### F7.1: Processing Queue
| Task | Subtasks |
|------|----------|
| T7.1.1: Queue persistence | SQLite storage |
| T7.1.2: State transitions | pending -> processing -> completed/failed |
| T7.1.3: Retry management | Exponential backoff, max retries |

#### F7.2: Preferences
| Task | Subtasks |
|------|----------|
| T7.2.1: Settings persistence | All user preferences stored locally |
| T7.2.2: Default values | Sensible defaults on first launch |

### F8: Optional Backend Sync

#### F8.1: Sync Engine
| Task | Subtasks |
|------|----------|
| T8.1.1: Pull changes | Fetch server changes since timestamp |
| T8.1.2: Push changes | Upload local changes |
| T8.1.3: Conflict resolution | Last-write-wins strategy |

#### F8.2: Error Logging
| Task | Subtasks |
|------|----------|
| T8.2.1: Error capture | Structured error logging |
| T8.2.2: Error upload | Batch upload to server |
