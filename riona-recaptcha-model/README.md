# Riona reCAPTCHA model

This model is integrated into the main repo and run via root npm scripts. It's a CNN-based image classifier for detecting reCAPTCHA challenges, built with TensorFlow.js.

## Project Structure

```
riona-recaptcha-model/
├── data/
│   ├── correct/     # Directory for correctly labeled CAPTCHA training images
│   └── incorrect/   # Directory for incorrectly labeled CAPTCHA training images
├── model/           # Trained model files
│   ├── model.json
│   └── weights.bin
├── public/
│   ├── admin/       # Admin dashboard for monitoring
│   ├── debug/       # Debug output directory
│   ├── uploads/
│   │   └── predictions/ # Uploaded images and prediction results
│   └── riona/       # Public dashboard
├── src/
│   ├── config/      # Configuration files
│   ├── controllers/ # Route handlers
│   ├── data/        # Data loading and augmentation
│   │   ├── loader.ts # Loads and prepares training data
│   │   └── pipeline.ts # Image augmentation pipeline
│   ├── models/      # Database models
│   ├── routes/      # API routes
│   ├── scripts/     # Utility scripts (train, test, etc.)
│   ├── services/    # Business logic
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utilities (logging, etc.)
└── training/
    ├── directives/
    └── knowledge/   # Knowledge base files
```

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Required directories (created automatically if missing, but you can create them manually:
  - `data/correct/`
  - `data/incorrect/`
  - `public/uploads/predictions/`
  - `training/knowledge/`

## Setup

1. Ensure you have a `.env` file in the project root with:

   ```env
   MONGODB_URI=<your_mongodb_connection_string>
   PORT=8080 # Optional, defaults to 8080
   ```

2. Install dependencies from the root directory:
   ```bash
   npm install
   ```

## Run (dev)

Starts the development server with hot reloading:

```bash
npm run recaptcha:dev
```

## Train

Train the model using images from `data/correct/` and `data/incorrect/`:

```bash
npm run recaptcha:train
```

## Build + Serve

Build the project and run in production mode:

```bash
npm run recaptcha:build
npm run recaptcha:serve
```

## Configuration

Config lives in `riona-recaptcha-model/src/config/default.ts`. You can adjust:

- Image size
- Classification threshold
- Augmentation factor
- Training batch size, epochs, etc.
