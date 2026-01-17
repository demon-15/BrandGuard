# BrandGuard AI - Adobe Express Add-on

> **For comprehensive documentation, see the [main README](../README.md) in the project root.**

This directory contains the Adobe Express Add-on source code.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Build for production
npm run build

# Package for distribution
npm run package
```

## Directory Structure

```
src/
├── ui/                    # React UI Runtime (iframe panel)
│   ├── components/        # React components
│   │   ├── App.tsx        # Main application
│   │   ├── BrandKitCreator.tsx  # Brand kit creation modal
│   │   ├── BrandKitSelector.tsx # Multi-kit dropdown
│   │   ├── ViolationCard.tsx    # Violation display
│   │   └── ColorInput.tsx       # Color picker
│   └── utils/             # Utility functions
│       ├── colors.ts      # WCAG contrast calculations
│       ├── brandAlignment.ts  # Backend API client
│       └── brandKitUpload.ts  # JSON upload handler
├── sandbox/               # Document Sandbox Runtime
│   └── code.ts            # Document scanning & fixing
├── hooks/
│   └── useBrandKit.ts     # Brand kit state management
├── models/
│   └── DocumentSandboxApi.ts  # TypeScript interfaces
├── brand-kit.json         # Default brand configuration
├── brandConfig.ts         # Brand kit helpers
└── config.ts              # API configuration
```

## Key Features

- **Brand Audit**: Color, font, and WCAG contrast validation
- **One-Click Fixes**: Fix individual or all violations
- **Undo Support**: Revert bulk fixes
- **Brand Kit Creator**: Visual UI to create brand kits
- **Multi-Kit Support**: Manage and switch between brand kits
- **AI Tone Analysis**: Brand voice analysis powered by Gemini

## Architecture

This add-on uses Adobe Express's dual-runtime system:

1. **UI Runtime (iframe)**: React panel for user interaction
2. **Document Sandbox**: Secure runtime for document manipulation

Communication between runtimes uses `runtime.exposeApi()` and `runtime.apiProxy()`.

## Notes

- Scaffolded with `@adobe/create-ccweb-add-on`
- Requires the backend Azure Functions for AI tone analysis
