# Contributing to Passive Channels Task Management

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # ShadCN base components
│   └── *.tsx           # Feature components (to be organized)
├── contexts/           # React contexts (Auth, Data, Theme)
├── types/              # TypeScript type definitions
├── lib/                # Utility functions
├── stories/            # Storybook stories
└── index.css           # Global styles
```

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Start dev server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run typecheck        # Run TypeScript type checking

# Build
npm run build            # Build for production
npm run preview          # Preview production build
```

## 📝 Naming Conventions

### Components
- **PascalCase** for component files: `TaskCard.tsx`, `KanbanBoard.tsx`
- **Default exports** for single components
- **Named exports** for multiple related components

### Hooks
- **camelCase** with `use` prefix: `useAuth`, `useData`

### Types
- **PascalCase** for interfaces/types: `Task`, `Channel`, `User`

### Constants
- **UPPER_SNAKE_CASE** for constants: `DEFAULT_COLUMNS`, `STORAGE_KEYS`

## 🎨 Styling

- **Tailwind CSS** for all styling
- **CSS variables** for theme colors (defined in `index.css`)
- **Utility classes** for consistent spacing, shadows, and effects
- **Modern glassmorphism** design system (iOS-26 inspired)

### Key Style Classes
- `.modern-card` - Glass card with blur effect
- `.modern-button` - Gradient button styles
- `.icon-btn-liquid` - Circular icon buttons
- `.gradient-text` - Gradient text effect

## 🔑 Storage Keys

All localStorage keys are prefixed with `passive_`:
- `passive_channels_data`
- `passive_tasks_data`
- `passive_users_data`
- `passive_completed_tasks_data`

## 🚀 Adding New Features

1. Create component in appropriate folder
2. Add types to `src/types/index.ts`
3. Update context if needed (DataContext, AuthContext)
4. Follow existing patterns for consistency
5. Test all user roles (Owner, Manager, Employee)

## ✅ Before Committing

```bash
npm run typecheck       # Ensure no TypeScript errors
npm run lint:fix        # Fix linting issues
npm run format          # Format code
```

## 🧪 Testing Checklist

- [ ] Owner can access all features
- [ ] Channel Manager can access assigned channels
- [ ] Employee only sees assigned tasks
- [ ] All modals/dialogs work correctly
- [ ] Export functionality works
- [ ] Data persists in localStorage
- [ ] No console errors

## 🎯 Code Quality Guidelines

- Keep components under 300 lines
- Extract repeated logic to custom hooks
- Use TypeScript for all new code
- Add JSDoc comments for exported functions
- Avoid prop drilling (use context when needed)
- Memoize expensive computations
