# Memora

**Accessibility-First AI Image Captioning**

Memora automatically embeds AI-generated image captions into image metadata so that screen readers can read images wherever they are shared.

## Features

- 🤖 **On-Device AI** - TensorFlow Lite BLIP model for private, offline captioning
- ☁️ **Cloud AI Options** - Gemini 1.5 Flash and GPT-5.2 for enhanced quality
- 📝 **Embedded Metadata** - Captions stored in XMP, EXIF, and IPTC
- 🔄 **Background Processing** - Automatic captioning while you sleep
- 📴 **Fully Offline** - Works without internet connection
- ♿ **Accessibility-First** - Designed for screen reader users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ HomeScreen  │ │ Settings    │ │ CaptionEditor           ││
│  │ - Gallery   │ │ - AI Mode   │ │ - Edit caption          ││
│  │ - Progress  │ │ - Privacy   │ │ - Preview metadata      ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ App Init    │ │ State Mgmt  │ │ React Hooks             ││
│  │ - Bootstrap │ │ - Zustand   │ │ - useApp                ││
│  │ - Lifecycle │ │ - Persist   │ │ - usePreferences        ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Service Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ AI Engine   │ │ Gallery     │ │ Background Scheduler    ││
│  │ - TFLite    │ │ - Scanner   │ │ - expo-task-manager     ││
│  │ - Gemini    │ │ - Assets    │ │ - expo-background-fetch ││
│  │ - GPT-5.2   │ │             │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Metadata    │ │ Processing  │ │ Sync Service            ││
│  │ - Reader    │ │ - Queue     │ │ - Optional cloud sync   ││
│  │ - Writer    │ │ - Priority  │ │ - WiFi-only option      ││
│  │ - XMP/EXIF  │ │ - Retry     │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ SQLite      │ │ AsyncStorage│ │ Error Handling          ││
│  │ - Images    │ │ - Prefs     │ │ - Error types           ││
│  │ - History   │ │ - Onboard   │ │ - Reporting             ││
│  │ - Logs      │ │ - Device ID │ │ - Recovery              ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator
- Xcode (for iOS) or Android Studio (for Android)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/memora.git
cd memora

# Install mobile dependencies
cd mobile
npm install

# Install iOS dependencies
cd ios && pod install && cd ..

# Start development server
npx expo run:ios
# or
npx expo run:android
```

### Backend Setup (Optional)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Set up PostgreSQL database
createdb memora

# Run migrations
npm run migrate

# Start server
npm run dev
```

## Project Structure

```
memora/
├── docs/
│   ├── ARCHITECTURE.md      # System architecture
│   ├── FEATURES.md          # Feature breakdown
│   └── TEST_SPECIFICATIONS.md
├── backend/
│   ├── src/
│   │   ├── app.ts           # Express app
│   │   ├── routes/          # API endpoints
│   │   ├── database/        # PostgreSQL connection
│   │   └── types/           # TypeScript types
│   └── migrations/          # Database migrations
└── mobile/
    ├── src/
    │   ├── app/             # App initialization
    │   ├── components/      # Accessible UI components
    │   ├── screens/         # Screen components
    │   ├── services/        # Business logic
    │   ├── database/        # SQLite & preferences
    │   ├── store/           # Zustand state
    │   ├── errors/          # Error handling
    │   ├── utils/           # Accessibility utilities
    │   ├── navigation/      # React Navigation
    │   └── types/           # TypeScript types
    └── app.json             # Expo configuration
```

## AI Modes

| Mode | Description | Privacy | Quality |
|------|-------------|---------|---------|
| **On-Device** | TensorFlow Lite BLIP model | ⭐⭐⭐ Images never leave device | ⭐⭐ Good |
| **Cloud** | Gemini 1.5 Flash / GPT-5.2 | ⭐⭐ Encrypted transmission | ⭐⭐⭐ Excellent |
| **Hybrid** | On-device first, cloud fallback | ⭐⭐⭐ Privacy preserved | ⭐⭐⭐ Best |

## Metadata Formats

Memora writes captions to multiple metadata formats for maximum compatibility:

1. **XMP** (`dc:description`) - Primary format, best screen reader support
2. **EXIF** (`ImageDescription`) - Universal compatibility
3. **IPTC** (`Caption-Abstract`) - Professional photo workflows

## Accessibility Features

- Full VoiceOver and TalkBack support
- Screen reader announcements for progress
- High contrast mode
- Large text support
- Reduced motion option
- Haptic feedback
- Voice announcements

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- galleryScanner.test.ts
```

## Configuration

### User Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| `aiMode` | `on-device` | AI processing mode |
| `autoProcess` | `true` | Auto-caption new photos |
| `backgroundProcessing` | `true` | Process in background |
| `wifiOnlyProcessing` | `true` | Only process on WiFi |
| `metadataFormats` | `['xmp', 'exif', 'iptc']` | Formats to write |
| `overwriteExisting` | `false` | Replace existing captions |

### Environment Variables

```env
# Backend (optional)
DATABASE_URL=postgresql://localhost/memora
PORT=3000

# Mobile (for cloud AI)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

## Privacy

- **On-device processing**: Images never leave your device
- **No analytics**: We don't track usage
- **No cloud required**: Fully functional offline
- **Optional sync**: Cloud features are opt-in

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [BLIP](https://github.com/salesforce/BLIP) - Image captioning model
- [Expo](https://expo.dev) - React Native framework
- [TensorFlow Lite](https://www.tensorflow.org/lite) - On-device ML
