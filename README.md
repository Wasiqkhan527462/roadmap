# Roadster 🗺️ — AI Learning Roadmap Generator

> An AI-powered, personalized learning path designer that generates tailored, step-by-step A-to-Z learning roadmaps for any technology, skill, or career goal.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-F05032?logo=meta&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Cloud_%26_Local-black?logo=ollama&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Overview

**Roadster** is a modern, interactive web application that converts any topic into a complete, structured, and actionable learning roadmap. By analyzing your background, current career, available weekly hours, learning approach preference, and target mastery level, Roadster crafts tailored phase-by-phase learning paths complete with topics, hands-on projects, milestones, and curated learning resources.

---

## 🚀 Key Features

- 🎯 **Target Proficiency Levels**: Tailor your roadmap to your exact goals:
  - 🌱 **Basic / Beginner** (3–4 phases, 4–8 weeks): Fundamentals, setup, syntax, and starter projects.
  - 🚀 **Intermediate** (4–5 phases, 8–14 weeks): Core concepts, state management, APIs, and real-world app development.
  - ⚡ **Advanced** (5–6 phases, 14–20 weeks): Performance tuning, state architecture, security, and production deployment.
  - 🏆 **Mastery / Job-Ready Expert** (6–7 phases, 20–28 weeks): Full A-to-Z zero-to-hero mastery, enterprise architecture, specialization, and career interview readiness.

- ⏱️ **Strict Timeline Consistency**: Dynamically calculates and formats total roadmap duration from individual phase week durations to eliminate time mismatches.

- 🦙 **Multi-Provider AI Engine**:
  - ⚡ **Groq** *(Recommended)*: Ultra-fast execution (~300 tokens/sec) using `Llama 3.3 70B` & `Llama 3.1 8B` (100% Free).
  - 🦙 **Ollama** *(Cloud & Local)*: Run models via zero-setup Cloud engine or connect to your local Ollama server (`http://localhost:11434/v1`).
  - 🌐 **OpenRouter**: Access multi-model routing with `Auto Router`, `Gemma 2`, and `DeepSeek R1`.

- 🎨 **Premium Aesthetic & UX**:
  - Dynamic cartoon writing animation during AI generation.
  - Interactive multi-step conversational onboarding.
  - Sleek dark mode glassmorphism UI with timeline connectors.
  - JSON copy and export for saving or sharing roadmaps.

- 🔒 **Privacy First**: API keys and settings are stored locally in your browser (`localStorage`). No user data or credentials are saved on external servers.

---

## 💻 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Styling**: Modern Vanilla CSS3 with CSS variables & glassmorphism

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have Node.js installed on your system:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Wasiqkhan527462/roadmap.git
   cd roadmap
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional)**:
   Create a `.env` file in the project root if you want to provide default API keys:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:5173` (or the port shown in your terminal).

---

## ⚙️ AI Provider Setup

Roadster supports three AI providers which can be configured directly inside the app's **⚙️ Settings** modal:

| Provider | Type | API Key Required? | Setup Instructions |
|---|---|---|---|
| ⚡ **Groq** | Cloud *(Fastest)* | Yes *(Free)* | Get a free API key at [console.groq.com/keys](https://console.groq.com/keys) |
| 🦙 **Ollama Cloud** | Cloud | Yes | Enter your Ollama Cloud API key |
| 🦙 **Ollama Local** | Local | Optional | Run `ollama serve` locally (`http://localhost:11434/v1`) |
| 🌐 **OpenRouter** | Cloud | Yes *(Free/Paid)* | Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) |

---

## 📦 Build for Production

To create an optimized production build:

```bash
npm run build
```

To preview the built production bundle locally:

```bash
npm run preview
```

---

## 📁 Project Structure

```
Roadster/
├── public/                  # Favicons and static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ApiKeyModal.jsx  # AI configuration & settings modal
│   │   ├── WritingAnimation.jsx # Dynamic cartoon writing loader animation
│   │   └── Navbar.jsx       # Header navigation
│   ├── context/
│   │   └── AppContext.jsx   # Global application state management
│   ├── pages/
│   │   ├── LandingPage.jsx  # Hero landing page & topic input
│   │   ├── ChatFlow.jsx     # Conversational setup wizard
│   │   └── RoadmapView.jsx  # Interactive roadmap view & timeline
│   ├── services/
│   │   ├── aiService.js     # Provider API integration, parsing, & fallback
│   │   └── systemPrompt.js  # Level-specific AI system & user prompt templates
│   ├── index.css            # Design system, tokens, and global styles
│   └── main.jsx             # React application entry point
├── package.json
└── vite.config.js
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
