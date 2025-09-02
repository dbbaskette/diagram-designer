# Gotchas - Diagram Designer

## Project Structure Issues

### ⚠️ Duplicate Source Directories
**Issue**: There are two `src` directories in the project:
- `/src/` (project root) - **UNUSED/OUTDATED**
- `/frontend/src/` - **ACTIVE/CURRENT**

**Root Cause**: This appears to be from initial project setup confusion or copy-paste errors during development.

**Impact**: 
- Confusion about which files are actually being used
- Potential for editing wrong files
- Inconsistent code versions

**Solution**: 
```bash
# Remove the duplicate root src directory
rm -rf src/
```

**Prevention**: Always work within the `frontend/` directory for React development.

### ⚠️ Missing Git Repository
**Issue**: The project is not initialized as a Git repository.

**Impact**: No version control, no commit history, no collaboration features.

**Solution**: Initialize Git repository:
```bash
git init
git add .
git commit -m "Initial commit: Diagram Designer React app"
```

## Development Environment Issues

### ⚠️ No Backend Service
**Issue**: The project is frontend-only but PROJECT.md mentions Spring Boot integration.

**Current State**: 
- All metrics are mocked with `Math.random()`
- No real API endpoints
- Configuration is static JSON file

**Impact**: 
- No real-time data integration
- Limited to demo functionality
- Cannot persist configuration changes

**Solution**: Implement Spring Boot backend service as planned in PROJECT.md.

### ⚠️ Configuration Management
**Issue**: Diagram configuration is in a static JSON file (`/public/diagram-config.json`).

**Limitations**:
- No dynamic configuration updates
- No user-specific configurations
- No configuration validation
- No version control for configurations

**Solution**: Implement backend configuration service with database persistence.

## Code Quality Issues

### ⚠️ Hardcoded Values
**Issue**: Several hardcoded values throughout the codebase:

**Examples**:
- Mock data generation: `Math.floor(Math.random() * 1000)`
- Fixed colors and styling
- Hardcoded API endpoints in config

**Impact**: Difficult to customize, not production-ready.

**Solution**: Externalize all configuration values.

### ⚠️ Missing Error Handling
**Issue**: Limited error handling in API calls and data fetching.

**Examples**:
- No retry logic for failed API calls
- No fallback for missing configuration
- No user feedback for errors

**Solution**: Implement comprehensive error handling with user feedback.

### ⚠️ Type Safety Issues
**Issue**: Some TypeScript types are too permissive.

**Examples**:
```typescript
export interface NodeMetrics {
  [key: string]: any; // Too permissive
}
```

**Solution**: Define specific types for metrics data.

## Performance Issues

### ⚠️ No Data Caching
**Issue**: API calls are made on every render without caching.

**Impact**: Unnecessary network requests, poor performance.

**Solution**: Implement React Query caching strategies.

### ⚠️ Large Bundle Size
**Issue**: FontAwesome and other dependencies may create large bundles.

**Solution**: Use tree-shaking and code splitting.

## Security Issues

### ⚠️ API Keys in Configuration
**Issue**: API keys are stored in plain text in the configuration file.

**Example**:
```json
{
  "key": "xyz-apikey-for-webserver",
  "url": "https://monitoring.example.com/api/v1/webtraffic"
}
```

**Impact**: Security vulnerability, keys exposed in client-side code.

**Solution**: 
- Move API keys to backend service
- Use environment variables
- Implement proper authentication

## Browser Compatibility Issues

### ⚠️ Modern Browser Features
**Issue**: Uses modern JavaScript features that may not work in older browsers.

**Examples**:
- React 19 features
- Modern CSS Grid/Flexbox
- ES6+ syntax

**Solution**: Add polyfills and browser compatibility checks.

## Deployment Issues

### ⚠️ No Build Configuration
**Issue**: No production build optimization or deployment configuration.

**Missing**:
- Environment-specific configurations
- Build optimization
- Deployment scripts
- Docker configuration

**Solution**: Implement proper build and deployment pipeline.

## Testing Issues

### ⚠️ No Tests
**Issue**: No unit tests, integration tests, or end-to-end tests.

**Impact**: No confidence in code quality, difficult to refactor.

**Solution**: Implement comprehensive testing strategy.

## Documentation Issues

### ⚠️ Incomplete Documentation
**Issue**: Missing documentation for:
- API endpoints
- Configuration schema
- Development setup
- Deployment process

**Solution**: Complete documentation as per user rules.

## Known Workarounds

### Temporary Solutions
1. **Mock Data**: Use `Math.random()` for demo purposes
2. **Static Config**: Edit JSON file directly for configuration changes
3. **Manual Testing**: Test manually in browser for now

### Development Tips
1. Always work in `frontend/` directory
2. Use `npm run dev` for development server
3. Check browser console for errors
4. Use React DevTools for debugging

## Prevention Strategies

1. **Code Reviews**: Implement code review process
2. **Linting**: Use ESLint and Prettier consistently
3. **Type Safety**: Strict TypeScript configuration
4. **Testing**: Write tests before implementing features
5. **Documentation**: Update docs with every change
6. **Git Workflow**: Use proper Git branching strategy
