

# 📸 Memora – AI-Powered Image Captioning  
**Making memories visible, making images accessible**

Memora is a **React Native (Expo) mobile application** that automatically generates meaningful, accessibility-focused image descriptions using **Google Gemini 3.0**. It is built to make visual content understandable through screen readers — seamlessly, privately, and at scale.

Unlike traditional captioning tools, Memora embeds descriptions directly into image metadata, ensuring accessibility persists across apps, platforms, and devices rather than remaining confined to a single application.

---

## 🌱 Inspiration

The digital world is increasingly visual. Photos are central to communication, education, and memory — yet for many users, images remain inaccessible without meaningful descriptions. We repeatedly observed how shared images lack context, how educational diagrams cannot be interpreted by screen readers, and how personal photo libraries become collections of “unknown image” files.

Memora was created to address this gap by making accessibility **automatic rather than optional**, and by designing with real usage constraints in mind — privacy, simplicity, and reliability.

Our guiding principle is simple:

> **Accessibility should happen by default, not on request.**

---

## 🤖 What Memora Does

Memora continuously monitors a user’s photo library and automatically generates two complementary forms of image descriptions:

- **Concise alt text** optimized for screen readers  
- **Detailed contextual descriptions** that explain objects, people, text, and spatial relationships  

Using **Gemini 3.0’s vision-language capabilities**, Memora understands both visual content and embedded text, producing descriptions that go beyond generic labels.

These captions are embedded directly into the image’s **EXIF/XMP metadata**, allowing screen readers such as **TalkBack** and **VoiceOver** to read them instantly — across galleries, messaging apps, and photo platforms.

---

## 🎥 Demo

▶️ **Watch the live demo:**  
https://www.youtube.com/watch?v=1oNDaPndQXo

The demo walks through:
- Automatic image detection  
- Caption generation using Gemini 3.0  
- Metadata-based accessibility  
- Screen reader output in real time  

---

## ✨ Key Features

- 🤖 **Automatic Captioning** – Images are described as soon as they appear  
- 📱 **Batch Processing** – Multiple images can be processed together  
- 📝 **Detailed Descriptions** – Context-rich narratives for accessibility  
- 🔄 **Reprocessing Support** – Update captions when needed  
- ⚡ **Background Execution** – Hands-free, scheduled processing  
- 🛡️ **Privacy-First Design** – Images are never stored externally  
- 🌙 **Dark Mode** – Adaptive theming  
- ♿ **Accessibility-First UI** – Optimized for screen readers and touch navigation  
- ☁️ **Optional Google Photos Sync** *(planned)*  

---

## 🛠️ Technology & Architecture

Memora is built with a focus on reliability, modularity, and accessibility:

### Mobile & Frontend
- **React Native** (Expo SDK 51)  
- **TypeScript**  
- Redux Toolkit + Redux Persist  
- React Navigation  

### AI & Multimodal Processing
- **Google Gemini 3.0** for image understanding and caption generation  
- OCR pipelines for extracting text from images  
- Accessibility-focused prompting to avoid generic descriptions  

### Accessibility & System Design
- Background image detection using `expo-background-fetch`  
- EXIF / XMP metadata embedding for persistent accessibility  
- Native Text-to-Speech and Screen Reader APIs  
- Local-first storage with explicit user consent for any cloud interaction  

This architecture allows each component to be tested independently while ensuring the end-to-end flow remains functional and responsive.

---

## 🚀 How It Works (End-to-End)

1. A new image is captured or added to the device  
2. Background tasks detect the image automatically  
3. Gemini 3.0 analyzes visual and textual content  
4. Alt text and detailed descriptions are generated  
5. Captions are embedded into image metadata  
6. Screen readers can immediately read the description  

No manual uploads. No repeated actions.

---

## 🌍 Impact

Memora addresses a widespread and meaningful accessibility gap in everyday digital interactions. By making images understandable by default, it supports:

- Inclusive education through accessible diagrams and notes  
- Independent access to personal memories and shared media  
- Scalable accessibility across devices and platforms  

The solution is designed to work across age groups — from students in classrooms to older users revisiting lifelong memories — without requiring technical expertise.

---

## 🔮 Future Direction

Planned extensions include:
- On-device inference for low-connectivity environments  
- Expanded multilingual support  
- Accessibility for short videos and educational visuals  
- Deeper integration with messaging and photo platforms  
- Collaboration with accessibility organizations and schools  

---
## 📦 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed or set up:

* **Node.js 18+**
* **Expo CLI**:
    ```bash
    npm install -g @expo/cli
    ```
* **Gemini API key**
* **Android / iOS device** or simulator

### Installation

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone [https://github.com/ReservedSnow673/Memora.git](https://github.com/ReservedSnow673/Memora.git)
    cd "Memora 2.0"
    npm install
    cp .env.example .env
    ```

2.  **Add your API key:**
    Open the `.env` file and paste your key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Run the app:**
    ```bash
    npx expo start
    ```

---

## 👨‍💻 Team

* **ReservedSnow673** • [GitHub Profile](https://github.com/ReservedSnow673)
* **Pranav435** • [GitHub Profile](https://github.com/Pranav435)

---

## 🙏 Acknowledgments

* **Google Gemini team** for the Vision API
* **Expo team** for the React Native framework
* **The accessibility community** for continuous guidance and feedback

---

> *Built with care for accessibility, inclusion, and real-world impact.*
