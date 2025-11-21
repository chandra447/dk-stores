# Technology Stack & Development Setup

## Core Technologies

### Frontend Stack
- **React 19.2.0** - Latest React with concurrent features
- **Vite 7.2.4** - Fast development server and build tool
- **React Router DOM 6.30.2** - Client-side routing
- **TypeScript** - Type safety (configured for Convex integration)

### Styling & UI
- **Tailwind CSS 4.1.17** - Utility-first CSS framework
- **daisyUI 5.5.5** - Component library built on Tailwind
- **Custom "titaniumghost" theme** - Dark theme with specific color palette

### Backend & Database
- **Convex 1.29.3** - Serverless backend with:
  - Real-time database
  - Serverless functions
  - Automatic type generation
  - Built-in authentication

### Authentication
- **@convex-dev/auth** - Convex Auth Beta
  - Password provider
  - Session management
  - Role-based access control

## Development Tools

### Build & Development
- **Vite** - Development server with HMR
- **ESLint 9.39.1** - Code linting with React plugins
- **TypeScript** - Static type checking

### Package Management
- **npm** - Package manager
- **package-lock.json** - Dependency lock file

## Project Structure

```
dk-attendence-system/
├── public/                 # Static assets
├── src/                   # Frontend source
│   ├── assets/            # React logos and images
│   ├── App.jsx            # Main application component
│   ├── App.css            # Tailwind + daisyUI configuration
│   ├── index.css          # Base styles reset
│   └── main.jsx          # Application entry point
├── convex/                # Backend source
│   ├── _generated/        # Auto-generated types
│   ├── README.md          # Convex documentation
│   └── tsconfig.json     # TypeScript config for backend
├── .kilocode/           # Kilo Code configuration
│   └── rules/           # Project rules and memory bank
├── .vite/               # Vite cache
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
└── README.md            # Basic project info
```

## Configuration Files

### Vite Configuration (`vite.config.js`)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

### Tailwind + daisyUI Setup (`src/App.css`)
```css
@import "tailwindcss";
@plugin "daisyui";

@plugin "daisyui/theme" {
  name: "titaniumghost";
  // ... custom theme configuration
}
```

### Package Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

## Development Workflow

### Local Development Setup
1. **Install dependencies:** `npm install`
2. **Start frontend:** `npm run dev` (runs on port 5173)
3. **Start backend:** `npx convex dev` (needs to be run separately)
4. **Linting:** `npm run lint`

### Build Process
1. **Build for production:** `npm run build`
2. **Preview build:** `npm run preview`

## Environment Requirements

### Node.js
- **Version:** Compatible with Vite 7.x (typically Node 18+)
- **Package manager:** npm

### Browser Support
- Modern browsers with ES2020+ support
- React 19 features enabled

## Convex Backend Configuration

### Current State
- ✅ Convex backend initialized
- ✅ TypeScript configuration present
- ✅ Generated API files ready
- ❌ No `schema.ts` file exists
- ❌ No custom functions implemented

### Convex File Structure
```
convex/
├── _generated/
│   ├── api.d.ts         # Generated API types
│   ├── api.js           # Generated API client
│   ├── dataModel.d.ts   # Generated data model (no schema yet)
│   ├── server.d.ts      # Generated server types
│   └── server.js        # Generated server utilities
├── tsconfig.json        # TypeScript configuration
└── README.md           # Convex documentation
```

## Styling Architecture

### daisyUI Integration
- **Theme system:** Custom dark theme "titaniumghost"
- **Component library:** Full daisyUI 5 component set
- **Responsive design:** Mobile-first approach
- **Color system:** OKLCH color space for better consistency

### CSS Organization
- **Base styles:** `src/index.css` (resets, base styles)
- **Theme configuration:** `src/App.css` (Tailwind + daisyUI setup)
- **Component styling:** Utility classes via Tailwind/daisyUI

## Security Considerations

### Authentication
- Password-based authentication via Convex Auth
- Session management handled by Convex
- Role-based access control to be implemented

### Data Validation
- Convex schema validation (once schema is defined)
- Input validation on all mutations
- Type safety via TypeScript

## Performance Optimizations

### Frontend
- Vite's optimized bundling
- React 19 concurrent features
- Code splitting potential (not yet implemented)

### Backend
- Convex's automatic scaling
- Real-time subscription efficiency
- Database indexing (to be configured)

## Deployment Architecture

### Frontend Deployment
- **Target:** Static hosting (Netlify, Vercel, etc.)
- **Build output:** Optimized SPA in `dist/` folder
- **Environment variables:** Convex deployment URL

### Backend Deployment
- **Platform:** Convex serverless
- **Process:** `npx convex deploy`
- **Data persistence:** Managed by Convex

## Development Best Practices

### Code Organization
- Feature-based component structure
- Separation of concerns
- TypeScript throughout

### Git Workflow
- `.gitignore` includes node_modules, .vite, dist
- Source control for all source files
- Generated files excluded from version control

### Testing Strategy
- ESLint for code quality
- Future: Unit tests for utilities
- Future: Integration tests for user flows