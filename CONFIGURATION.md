# Diagram Configuration Setup

This project uses a configuration-driven approach for creating interactive dataflow diagrams. The actual configuration file contains sensitive data and is excluded from git, while a template and documentation are provided for reference.

## Quick Setup

1. **Run the setup script**:
   ```bash
   ./setup-diagram-config.sh
   ```

2. **Edit the configuration**:
   - Open `frontend/public/diagram-config.json`
   - Replace example data with your actual configuration
   - Add your API keys, URLs, and sensitive information

3. **Start the development server**:
   ```bash
   cd frontend && npm run dev
   ```

## Files Overview

| File | Purpose | Git Status |
|------|---------|------------|
| `diagram-config.json` | **Actual configuration** (contains sensitive data) | ❌ Excluded |
| `diagram-config-template.json` | Template with all options | ✅ Included |
| `diagram-config-documentation.md` | Complete documentation | ✅ Included |
| `setup-diagram-config.sh` | Setup script | ✅ Included |

## Configuration Features

### 🎨 **Visual Customization**
- Custom node icons (FontAwesome or local images)
- Configurable colors and line styles
- Multiple edge types (curved, straight, stepped)
- Animated particles on connections

### 🔗 **Connection Management**
- Right-to-left connection definition
- Multiple connection points per node
- Specific handle targeting
- No overlapping connections

### 📊 **Real-time Metrics**
- Configurable data grids
- API integration for live data
- Customizable update intervals
- Multiple metrics per node

### 🎯 **Node Configuration**
- Position control
- Handle configuration (input/output points)
- Connection properties
- Animation settings

## Security Notes

- **Never commit** `diagram-config.json` to git
- **Use the template** for sharing configuration examples
- **Store sensitive data** (API keys, URLs) in the actual config only
- **Use environment variables** for production deployments

## Development Workflow

1. **Template changes**: Update `diagram-config-template.json` and commit
2. **Local development**: Edit `diagram-config.json` (not committed)
3. **Documentation**: Update `diagram-config-documentation.md` for new features
4. **Setup**: New developers run `./setup-diagram-config.sh`

## Example Configuration

See `frontend/public/diagram-config-template.json` for a complete example with all available options.

## Documentation

For detailed configuration options, see `frontend/public/diagram-config-documentation.md`.
