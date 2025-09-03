# Diagram Designer

A React-based interactive diagram designer for visualizing system architecture with real-time metrics, animated particles, and dynamic status indicators.

## Features

- **Interactive Node-Based Diagrams**: Create and configure system components with custom icons and styling
- **Real-Time Metrics**: Display live data from API endpoints with configurable update intervals
- **Animated Particles**: Visualize data flow with configurable particle animations
- **Status Monitoring**: Real-time health status indicators for each component
- **Customizable Styling**: Configure colors, glow effects, and visual properties
- **Connection Management**: Define connections between components with multiple handle support

## Icon Configuration

This project supports FontAwesome icons for node visualization. You can use any FontAwesome icon by specifying it in the `icon` field of your node configuration.

### Available Icon Types

- **Solid icons**: `"fas fa-iconname"` (e.g., `"fas fa-server"`)
- **Regular icons**: `"far fa-iconname"`
- **Brand icons**: `"fab fa-iconname"`

### Browse Available Icons

- **FontAwesome Icons**: https://fontawesome.com/icons
- **Free Icons**: https://fontawesome.com/icons?d=gallery&m=free
- **Search Icons**: https://fontawesome.com/search

### Popular Server/Tech Icons

```json
{
  "icon": "fas fa-server",        // Server
  "icon": "fas fa-database",      // Database
  "icon": "fas fa-cloud",         // Cloud
  "icon": "fas fa-network-wired", // Network
  "icon": "fas fa-microchip",     // CPU/Processor
  "icon": "fas fa-memory",        // Memory
  "icon": "fas fa-hdd",           // Hard Drive
  "icon": "fas fa-globe",         // Web/Internet
  "icon": "fas fa-shield-alt",    // Security
  "icon": "fas fa-cogs"           // Settings/Configuration
}
```

### Local Image Icons

You can also use local image files:

```json
{
  "icon": "/assets/icons/icon.svg",
  "icon": "/assets/icons/icon.png"
}
```

## Configuration

The diagram is configured via `public/diagram-config.json`. See the configuration documentation for detailed setup instructions.

## Development

This project uses React + TypeScript + Vite for development.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
