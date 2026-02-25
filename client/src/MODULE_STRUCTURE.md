# Project Structure

```
client/src/
├── App.js                 # Root app with routing
├── index.js              # React entry point
├── index.css             # Global styles
├── modules/
│   ├── website/          # Marketing website module
│   │   └── WebsitePage.js
│   ├── auth/             # Authentication module (placeholder)
│   │   └── AuthPage.js
│   └── dashboard/        # Dashboard module (placeholder)
│       └── DashboardPage.js
├── routes/
│   └── index.js          # Centralized route configuration
├── components/           # Shared components (future)
└── shared/              # Shared utilities, hooks, constants (future)
```

## Module Structure

Each module is self-contained and can have:

- Component files (.js/.jsx)
- Styles (.css or CSS modules)
- Utils and helpers
- API services (if applicable)

### Website Module

Contains the marketing homepage with all sections (Hero, Features, Services, Testimonials, etc.)

- Route: `/`

### Auth Module

Will contain:

- Login page
- Registration page
- Password reset flow
- Route: `/auth`

### Dashboard Module

Will contain:

- User dashboard
- Inventory management
- Prescription management
- Analytics
- Route: `/dashboard`

## Adding a New Module

1. Create folder under `src/modules/{moduleName}`
2. Add your components and pages
3. Register route in `src/routes/index.js`
4. Create a README in the module folder documenting its structure

## Development

- Routes are centralized in `src/routes/index.js`
- Global styles in `src/index.css`
- Module-specific styles should be placed in their respective module folders
- Shared components and utilities go in `src/components` and `src/shared`
