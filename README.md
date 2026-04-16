# Document & Subscription Manager

A modern web application for managing documents and subscriptions, built with React, TypeScript, and Vite.

## Features

- 📄 Document management system
- 💳 Subscription tracking and management
- 📊 Data visualization with charts
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design
- 🔔 Toast notifications
- 🗓️ Date handling and formatting
- 🗃️ Supabase integration for backend services

## Tech Stack

- **Frontend Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Routing:** React Router DOM v6
- **UI Components:** 
  - Radix UI (Dropdown Menu)
  - Lucide React (Icons)
  - Recharts (Charts & Graphs)
- **Backend:** Supabase
- **Notifications:** React Hot Toast
- **Date Utilities:** date-fns

## Prerequisites

- Node.js (v16 or higher)
- npm, yarn, or pnpm

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Documents-Subscription
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Zustand state management
│   ├── services/       # API and Supabase services
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   ├── main.tsx        # Application entry point
│   └── App.tsx         # Main App component
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Project dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

- **Vite:** Configured in `vite.config.ts`
- **Tailwind CSS:** Configured in `tailwind.config.js`
- **TypeScript:** Configured in `tsconfig.json`
- **ESLint:** Configured in `eslint.config.js`

## Deployment

The application can be deployed to any static hosting service:

- **Vercel:** Configuration in `vercel.json`
- **Netlify:** Use `static.json` for configuration
- Build the project and deploy the `dist` folder

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## License

Private project - All rights reserved
