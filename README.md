<p align="center">
  <img src="https://img.shields.io/badge/Adobe%20Express-Add--on-FF0000?style=for-the-badge&logo=adobe&logoColor=white" alt="Adobe Express Add-on" />
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Azure%20Functions-Python-0089D6?style=for-the-badge&logo=azure-functions&logoColor=white" alt="Azure Functions" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
</p>

<h1 align="center">
  🛡️ BrandGuard AI
</h1>

<p align="center">
  <strong>An intelligent Adobe Express Add-on that audits designs for brand compliance</strong>
  <br />
  <em>Check colors, fonts, WCAG accessibility, and brand voice — all in one click</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-brand-kit-configuration">Brand Kit</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 📖 Overview

**BrandGuard AI** is a comprehensive brand compliance solution for Adobe Express. It empowers designers and marketing teams to maintain brand consistency by automatically auditing documents against configurable brand guidelines.

Whether you're checking if that blue matches your brand palette, ensuring fonts are on-brand, verifying WCAG accessibility standards, or analyzing the tone of your copy — BrandGuard AI has you covered.

### Why BrandGuard AI?

- **Save Time**: Instantly audit entire documents instead of manual checks
- **Ensure Consistency**: Maintain brand standards across all designs
- **Accessibility First**: Built-in WCAG AA/AAA contrast validation
- **AI-Powered**: Intelligent brand voice analysis for copy
- **One-Click Fixes**: Automatically correct violations with suggested alternatives

---

## ✨ Features

### 🎨 Brand Audit
- **Color Compliance**: Detect off-brand colors and suggest nearest brand alternatives
- **Font Validation**: Flag non-approved fonts with one-click replacement
- **WCAG Contrast Checking**: AA (4.5:1) and AAA (7:1) compliance for accessibility
- **Background-Aware Analysis**: Smart contrast calculations against actual container backgrounds

### 🔧 One-Click Fixes
- **Fix Individual**: Apply suggested fixes to single elements
- **Fix All**: Batch fix all violations with one click
- **Undo Support**: Revert all fixes if needed
- **Smart Suggestions**: AI-powered color selection considering both brand compliance and contrast

### 🎤 AI Brand Voice Analysis
- **Tone Assessment**: Analyze text content against luxury brand voice standards
- **Alignment Score**: 0-100% score indicating brand voice alignment
- **AI Suggestions**: Get rewrite recommendations for off-brand copy
- **Powered by Gemini**: Google's latest AI for accurate analysis

### 📦 Brand Kit Management
- **Visual Creator**: Designer-friendly UI to create brand kits without JSON
- **Multi-Kit Support**: Manage multiple brand kits and switch between them
- **JSON Upload**: Import existing brand guidelines as JSON
- **Real-time Validation**: Instant feedback on brand kit configuration

### 📋 Detailed Violation Cards
- **Visual Comparisons**: Side-by-side current vs. suggested colors
- **Font Previews**: See current and brand fonts in context
- **Contrast Badges**: Pass/Fail indicators with exact ratios
- **Explanations**: Hover for detailed violation explanations
- **Unfixable Warnings**: Clear alerts when brand palette can't achieve WCAG compliance

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for backend functions)
- Azure Functions Core Tools v4 (for local development)
- Adobe Express account (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/brandguard-ai.git
   cd brandguard-ai
   ```

2. **Install Add-on dependencies**
   ```bash
   cd brandguard-ai
   npm install
   ```

3. **Install Backend dependencies**
   ```bash
   cd ../brandguard-functions
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   ```

4. **Configure environment**
   
   Create `brandguard-functions/local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "python",
       "AzureWebJobsStorage": "",
       "GEMINI_API_KEY": "your-gemini-api-key",
       "GEMINI_API_KEY_BACKUP": "optional-backup-key"
     }
   }
   ```

5. **Start the development servers**

   Terminal 1 - Backend:
   ```bash
   cd brandguard-functions
   func start
   ```

   Terminal 2 - Add-on:
   ```bash
   cd brandguard-ai
   npm run start
   ```

6. **Load in Adobe Express**
   - Open [Adobe Express](https://express.adobe.com)
   - Go to Add-ons → Your Add-ons → In Development
   - The add-on will appear in your sidebar

---

## 🏗️ Architecture

BrandGuard AI uses Adobe Express's **dual-runtime architecture**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Adobe Express                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │     UI Runtime       │       │    Document Sandbox          │   │
│  │     (iframe)         │◄─────►│    (Secure Runtime)          │   │
│  │                      │       │                              │   │
│  │  • React 18 Panel    │  API  │  • Document Scanning         │   │
│  │  • Brand Kit UI      │ Proxy │  • Color/Font Fixing         │   │
│  │  • Violation Cards   │       │  • Node Traversal            │   │
│  │  • Tone Analysis     │       │  • Express Document SDK      │   │
│  └──────────────────────┘       └──────────────────────────────┘   │
│           │                                                         │
└───────────│─────────────────────────────────────────────────────────┘
            │ HTTPS
            ▼
┌──────────────────────────────────────┐
│        Azure Functions               │
│                                      │
│  • Brand Alignment Analysis          │
│  • Google Gemini API Integration     │
│  • CORS Enabled for Add-on           │
└──────────────────────────────────────┘
```

### Project Structure

```
brandguard-ai/
├── brandguard-ai/              # Adobe Express Add-on
│   ├── src/
│   │   ├── ui/                 # React UI Runtime
│   │   │   ├── components/
│   │   │   │   ├── App.tsx             # Main application component
│   │   │   │   ├── BrandKitCreator.tsx # Brand kit creation modal
│   │   │   │   ├── BrandKitSelector.tsx# Multi-kit dropdown
│   │   │   │   ├── ViolationCard.tsx   # Violation display cards
│   │   │   │   └── ColorInput.tsx      # Color picker component
│   │   │   └── utils/
│   │   │       ├── colors.ts           # WCAG contrast calculations
│   │   │       ├── brandAlignment.ts   # Backend API client
│   │   │       └── brandKitUpload.ts   # JSON upload handler
│   │   ├── sandbox/            # Document Sandbox Runtime
│   │   │   └── code.ts                 # Document scanning & fixing
│   │   ├── hooks/
│   │   │   └── useBrandKit.ts          # Brand kit state management
│   │   ├── models/
│   │   │   └── DocumentSandboxApi.ts   # TypeScript interfaces
│   │   ├── brand-kit.json              # Default brand configuration
│   │   ├── brandConfig.ts              # Brand kit helpers
│   │   └── config.ts                   # API configuration
│   ├── package.json
│   └── webpack.config.js
│
├── brandguard-functions/       # Azure Functions Backend
│   ├── BrandAlignmentFunction/
│   │   ├── __init__.py         # Gemini API integration
│   │   └── function.json       # Function bindings
│   ├── requirements.txt
│   └── host.json
│
└── .cursor/rules/              # Development context
```

---

## 🎨 Brand Kit Configuration

### JSON Schema

BrandGuard supports both legacy and extended brand kit formats:

#### Basic Format
```json
{
  "name": "My Brand",
  "allowedColors": ["#232D4B", "#E57200", "#FFFFFF"],
  "allowedFonts": ["Arial", "Georgia"],
  "accessibility": {
    "minContrast": 4.5
  }
}
```

#### Extended Format (Full Control)
```json
{
  "name": "Enterprise Brand 2024",
  "typography": {
    "title": { "font": "Georgia" },
    "body": { "font": "Arial" },
    "caption": { "font": "Arial" }
  },
  "typographyRules": {
    "allowBold": true,
    "allowItalic": true,
    "allowUnderline": false,
    "minFontSize": 12,
    "maxFontSize": 72
  },
  "colors": {
    "primary": ["#232D4B", "#E57200"],
    "secondary": ["#FFFFFF", "#DADADA"]
  },
  "customRules": {
    "noBoldAnywhere": false,
    "singleFontPerType": true,
    "enforceMinBodySize": true,
    "minBodySize": 14
  },
  "accessibility": {
    "minContrast": 4.5
  }
}
```

### Supported Fonts

The following fonts are available in Adobe Express and can be used in brand kits:

| Font Family | PostScript Name |
|-------------|-----------------|
| Arial | ArialMT |
| Georgia | Georgia |
| Courier | Courier |
| Courier New | CourierNewPSMT |
| Source Sans 3 | SourceSans3 |
| Lato | Lato |
| Times New Roman | TimesNewRomanPSMT |
| Verdana | Verdana |
| Tahoma | Tahoma |
| Helvetica | Helvetica |
| Comic Sans MS | ComicSansMS |
| Impact | Impact |
| Trebuchet MS | TrebuchetMS |
| Lucida Sans Unicode | LucidaSansUnicode |
| Palatino | Palatino |
| Garamond | Garamond |
| Bookman | Bookman |
| Avant Garde | AvantGarde |
| Century Gothic | CenturyGothic |
| Futura | Futura |

### WCAG Contrast Levels

| Level | Ratio | Use Case |
|-------|-------|----------|
| AA Large Text | 3:1 | Text ≥18px or ≥14px bold |
| AA Normal | 4.5:1 | Standard body text |
| AAA | 7:1 | Enhanced accessibility |

---

## 📡 API Reference

### Document Sandbox API

The `DocumentSandboxApi` interface exposes these methods to the UI runtime:

```typescript
interface DocumentSandboxApi {
  /** Scan all document elements, return colors, fonts, containers */
  scanDocument(): Promise<{
    results: ScannedElement[];
    violations: FontViolation[];
  }>;

  /** Apply a brand-compliant color to a node */
  fixColor(nodeId: string, hexColor: string): Promise<boolean>;

  /** Apply a brand-compliant font to a text node */
  fixFont(nodeId: string, fontFamily: string): Promise<boolean>;

  /** Restore original color (for undo) */
  restoreColor(nodeId: string, hexColor: string): Promise<boolean>;

  /** Restore original font (for undo) */
  restoreFont(nodeId: string, fontName: string): Promise<boolean>;
}
```

### Brand Alignment Backend API

**Endpoint**: `POST /api/brand-alignment`

**Request Body**:
```json
{
  "textToAnalyze": "Your marketing copy here..."
}
```

**Response** (Success):
```json
{
  "success": true,
  "score": 85,
  "suggestion": "Consider replacing 'cheap' with 'exceptional value'...",
  "original_text": "Your marketing copy here..."
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Text exceeds maximum length of 5000 characters"
}
```

---

## 🛠️ Tech Stack

### Frontend (Add-on)
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript 5.3** | Type safety |
| **Webpack 5** | Module bundling |
| **Spectrum Web Components** | Adobe design system |
| **Express Document SDK** | Document manipulation |
| **Add-on SDK** | Adobe Express integration |

### Backend (Azure Functions)
| Technology | Purpose |
|------------|---------|
| **Python 3.9+** | Runtime |
| **Azure Functions v4** | Serverless compute |
| **Google Gemini API** | AI text analysis |
| **Requests** | HTTP client |

### Development
| Tool | Purpose |
|------|---------|
| **Adobe ccweb-add-on-scripts** | Build tooling |
| **Azure Functions Core Tools** | Local development |
| **ESLint + Prettier** | Code quality |

---

## 🔧 Configuration

### Environment Variables

#### Add-on (Optional)
```bash
# Set in .env or webpack DefinePlugin
BACKEND_API_URL=https://your-function-app.azurewebsites.net
```

#### Azure Functions (Required)
```bash
# local.settings.json or Azure App Settings
GEMINI_API_KEY=your-primary-gemini-api-key
GEMINI_API_KEY_BACKUP=your-backup-gemini-api-key  # Optional fallback
```

### Runtime Configuration

The backend URL can be configured at runtime:
```javascript
// In browser console
window.BACKEND_API_URL = 'https://your-production-url.azurewebsites.net';
```

---

## 📜 Scripts

### Add-on (`brandguard-ai/`)
```bash
npm run start      # Start development server with hot reload
npm run build      # Build for production
npm run package    # Create distributable package
npm run clean      # Clean build artifacts
```

### Backend (`brandguard-functions/`)
```bash
func start                    # Run functions locally
func azure functionapp publish # Deploy to Azure
```

---

## 🧪 Testing

### Manual Testing
1. Start both development servers
2. Open Adobe Express
3. Create a design with various colors and fonts
4. Run Brand Audit to see violations
5. Test Fix and Fix All functionality
6. Add text and run Tone Check

### API Testing
```bash
# Test brand alignment endpoint
curl -X POST http://localhost:7071/api/brand-alignment \
  -H "Content-Type: application/json" \
  -d '{"textToAnalyze": "Buy now! Cheap prices!"}'
```

---

## 🚢 Deployment

### Add-on Submission
1. Build the production bundle:
   ```bash
   cd brandguard-ai
   npm run package
   ```
2. Submit to Adobe Exchange Developer Console

### Backend Deployment
1. Create Azure Function App:
   ```bash
   az functionapp create \
     --resource-group myResourceGroup \
     --consumption-plan-location westus2 \
     --runtime python \
     --runtime-version 3.9 \
     --functions-version 4 \
     --name brandguard-functions \
     --storage-account mystorageaccount
   ```

2. Configure secrets:
   ```bash
   az functionapp config appsettings set \
     --name brandguard-functions \
     --resource-group myResourceGroup \
     --settings GEMINI_API_KEY="your-key"
   ```

3. Deploy:
   ```bash
   cd brandguard-functions
   func azure functionapp publish brandguard-functions
   ```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add TypeScript types for new code
- Update documentation for new features
- Test with Adobe Express before submitting

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Adobe Express Add-on SDK](https://developer.adobe.com/express/add-ons/) - Platform APIs
- [Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/) - Design system
- [Google Gemini](https://ai.google.dev/) - AI-powered text analysis
- [Azure Functions](https://azure.microsoft.com/en-us/products/functions/) - Serverless backend

---

<p align="center">
  Built with ❤️ for designers who care about brand consistency
</p>
