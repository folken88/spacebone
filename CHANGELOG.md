# Changelog

All notable changes to the Spacebone Item Creator module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Anthropic API Version**: Updated Anthropic Claude API version header from `2023-06-01` to `2024-10-01` for improved compatibility and access to latest features (as of December 2025)

### Fixed
- **Aura School Detection**: Fixed issue where aura school types were not being properly set in FoundryVTT. The system now correctly maps full school names (e.g., "evocation") to PF1 abbreviations (e.g., "evo") for proper FoundryVTT integration.

### Added
- **Special Weapon Abilities**: Automatic detection and implementation of magical weapon properties (flaming, frost, shock, holy, etc.)
- **Burst Abilities Support**: Full support for burst weapons with both normal and critical hit damage (flaming burst, icy burst, etc.)
- **Critical Damage System**: Proper `damage.critParts` implementation for abilities that trigger on critical hits
- **Custom Damage Parsing**: Advanced regex parsing for complex damage descriptions in LLM responses
- **Comprehensive Materials System**: Full PF1 special materials implementation with 15+ materials including mithral, adamantine, cold iron, silver, and campaign-specific materials
- **Material Auto-Detection**: Intelligent material detection from item names, descriptions, and explicit MATERIAL template fields
- **Material Properties**: Complete material effects including weight modification, hardness changes, masterwork requirements, and armor category reduction
- **Campaign Materials**: Custom materials inspired by user's campaign (Sea-Steel, Skymetal, Living Steel) with unique properties
- **Material Cost Calculation**: Automatic price adjustments based on PF1 material pricing formulas
- **Contextual Bonus System**: Full implementation of PF1 changes array and contextNotes for skill bonuses, ability scores, saves, and conditional effects
- **Intelligent Bonus Detection**: Advanced regex parsing to extract bonuses from LLM text descriptions and mechanical effects
- **PF1 Bonus Types**: Proper bonus type assignment (enhancement, competence, resistance, sacred, etc.) following PF1 stacking rules
- **Conditional Bonuses**: Context notes for situational bonuses that appear during specific skill checks or conditions
- **Spell-Like Abilities System**: Complete conversion of SPELL_ABILITY template entries into proper FoundryVTT actions
- **Comprehensive Spell Database**: Built-in support for 6+ common spells (Fireball, Lightning Bolt, Cure Light Wounds, etc.) with full mechanics
- **Smart Spell Parsing**: Automatic parsing of activation types, uses per day, save DCs, and damage formulas
- **Action Generation**: Creates proper PF1 actions with damage, saves, ranges, templates, and activation costs

### Changed
- **Special Abilities Processing**: Intelligent detection of burst vs. regular abilities with proper damage distribution
- **LLM Template**: Enhanced item generation template with dedicated MATERIAL field and comprehensive material guidance
- **Material Integration**: Seamless integration of materials system with existing item creation workflow
- **Bonus Detection**: Enhanced mechanical effects parsing with detailed examples and guidance for proper bonus formatting

### Fixed
- **Damage Type Detection**: Burst abilities correctly add both normal damage and critical hit damage
- **Ability Conflict Resolution**: Prevents duplicate damage types when multiple detection methods match

## [1.0.0] - 2025-09-07 - "Whispering Spirits" Release

### Added
- **Core Functionality**: Complete LLM-powered item generation system
- **Multi-Provider Support**: OpenAI GPT-4o, Anthropic Claude, Google Gemini, Local LLMs (Ollama/LM Studio)
- **Modular AI Architecture**: Extensible provider system with BaseProvider class
- **Template-Based Generation**: Structured item template system for consistent output
- **Comprehensive PF1 Integration**: Full Pathfinder 1e item creation with proper system data
- **Rich Icon System**: 140+ mapped PF1 system icons for weapons, armor, equipment
- **Smart Icon Matching**: Automatic icon selection based on item type and subtype
- **Modern UI**: Dark glassmorphism theme with 80% opacity and backdrop blur
- **Settings Integration**: Module settings panel with direct item creator access
- **Dynamic Model Fetching**: Automatic model discovery from LLM provider APIs
- **Regional Flavor Support**: Golarion-aware item generation with cultural context
- **Spell-Like Abilities**: Support for complex magical item effects and activations

### Changed
- **Model Default**: Switched from GPT-5 to GPT-4o for reliable structured output
- **API Parameters**: Updated to use `max_tokens` for GPT-4o compatibility
- **Icon System**: Replaced placeholder images with comprehensive PF1 system artwork
- **Item Creation**: Direct world item creation (removed folder requirement)

### Fixed
- **Critical**: CSS interference with FoundryVTT UI completely eliminated
- **Critical**: OpenAI API compatibility issues resolved
- **Critical**: CORS preflight request problems fixed
- **UI**: Double border and text cutoff issues in dialog
- **UI**: Settings panel corruption from unscoped CSS selectors
- **Provider**: Auto-migration from invalid GPT-5 settings to GPT-4o
- **Generation**: Empty LLM responses caused by token exhaustion
- **Integration**: Module initialization and provider configuration synchronization

### Security
- **Headers**: Removed custom headers that triggered CORS preflight requests
- **Validation**: Added comprehensive API key validation and error handling

### Technical Details
- **Files**: 15 core modules across API, UI, factories, and utilities
- **Templates**: Structured LLM prompt templates for consistent item generation
- **CSS**: Fully scoped styling (`.dialog.window-app.spacebone-dialog`) preventing interference
- **Hooks**: FoundryVTT v13+ DOM compatibility with native DOM methods
- **Settings**: Auto-updating provider endpoints and model selection
- **Error Handling**: Comprehensive error logging and user feedback

## [2.0.0] - 2025-09-01

### Added
- **Multi-Provider AI Support**
  - OpenAI GPT-5 support with latest models
  - Anthropic Claude 4 integration
  - Google Gemini 2.0 support
  - Local LLM support (Ollama, LM Studio)
  - Modular provider architecture for easy expansion

- **Advanced Provider Management**
  - Automatic provider detection and validation
  - Connection testing for all providers
  - Provider-specific model selection
  - Configuration caching and persistence
  - Usage analytics and request history

- **Modern Glassmorphism UI**
  - Dark theme with glass-effect panels
  - Responsive design for all screen sizes
  - Enhanced form controls with better UX
  - Visual status indicators for AI generation
  - Example prompt buttons for quick setup

- **Enhanced Item Generation**
  - Improved context handling for better results
  - Regional flavor integration (Golarion regions)
  - Level-appropriate pricing and mechanics
  - Enhanced Pathfinder 1e rule compliance
  - Rich item descriptions with lore

- **Developer Experience**
  - Comprehensive JSDoc documentation
  - Modular architecture with clear separation of concerns
  - Debug mode with detailed logging
  - Provider abstraction layer for extensibility
  - Error handling and graceful degradation

- **Configuration & Settings**
  - Per-provider model selection
  - Customizable generation parameters
  - API endpoint configuration
  - Debug mode toggle
  - Folder name customization

### Changed
- **BREAKING**: Completely redesigned API architecture
- **BREAKING**: Updated settings structure for multi-provider support
- **BREAKING**: New UI layout and styling
- Improved error messages and user feedback
- Enhanced prompt building with better context awareness
- Better integration with FoundryVTT's native UI patterns

### Technical Changes
- Migrated from single provider to modular provider system
- Implemented abstract base class for provider consistency
- Added provider manager for lifecycle management
- Enhanced error handling and validation
- Improved code organization and documentation
- Added comprehensive unit test structure preparation

### Fixed
- Resolved button placement issues in Items directory
- Fixed compatibility with FoundryVTT v13+
- Improved error handling for network failures
- Better validation of AI responses
- Fixed memory leaks in request history

## [1.0.0] - 2025-08-15

### Added
- Initial release of Spacebone Item Creator
- Basic OpenAI GPT integration
- Simple item generation dialog
- Integration with FoundryVTT Items directory
- Basic Pathfinder 1e item structure support
- Folder management for generated items

### Features
- Natural language item prompts
- OpenAI GPT-4 support
- Basic item types (weapon, armor, equipment)
- Simple configuration panel
- Generated items stored in "Spacebone Items" folder

### Technical Implementation
- Basic API interface for OpenAI
- Simple UI with form controls
- Item factory for PF1 data structure
- Folder manager for organization
- Module settings integration

---

## Migration Guide

### From v1.x to v2.0

**⚠️ Important**: Version 2.0 includes breaking changes that require reconfiguration.

#### API Provider Configuration
1. **Old Settings** (v1.x):
   - Single "API Provider" dropdown
   - Single "API Key" field
   - Single "Model" field

2. **New Settings** (v2.0):
   - "LLM API Provider" with expanded options
   - Provider-specific configuration
   - Model selection per provider
   - Additional provider-specific options

#### Migration Steps
1. **Backup** your current module settings
2. **Note** your current API key and provider
3. **Update** to v2.0
4. **Reconfigure** your provider in the new settings panel
5. **Test** the connection using the new test button

#### UI Changes
- New glassmorphism design replaces the old interface
- Enhanced form controls with better organization
- Example prompt buttons for quick item generation
- Status indicators for AI processing

#### Code Changes (for developers)
- `SpaceboneAPI` class completely rewritten
- Provider system now uses abstract base classes
- Import paths changed for provider files
- Settings structure updated

---

## Version Support

| Version | FoundryVTT | PF1 System | Support Status |
|---------|------------|------------|----------------|
| 2.0.x   | v13+       | 11.8+      | ✅ Active      |
| 1.x     | v11-v12    | 11.0+      | ❌ Deprecated  |

---

## Roadmap

### Planned Features

#### v2.1.0 (Q4 2025)
- **Enhanced Item Types**
  - Artifacts and relics support
  - Consumables with complex effects
  - Cursed item generation
  - Intelligent item personalities

- **Advanced Generation**
  - Multi-step item creation process
  - Item variant generation
  - Batch item creation
  - Template-based generation

#### v2.2.0 (Q1 2026)
- **Integration Features**
  - Compendium export/import
  - Item sharing between worlds
  - Community item database
  - Version control for items

- **UI Enhancements**
  - Item preview before creation
  - Advanced filtering and search
  - Custom prompt templates
  - Generation history browser

#### v3.0.0 (Future)
- **Multi-System Support**
  - D&D 5e integration
  - Other game system adapters
  - Universal item format

- **Advanced AI Features**
  - Image generation for items
  - Voice-to-text prompts
  - Collaborative item creation
  - AI-powered item balancing

---

## Contributors

### Core Team
- **Lead Developer**: Spacebone Development Team
- **UI/UX Design**: Spacebone Development Team
- **Documentation**: Spacebone Development Team

### Community Contributors
- Report issues and suggestions on GitHub
- Submit pull requests for improvements
- Share example prompts and use cases

---

## Links

- **GitHub Repository**: [Link to repository]
- **FoundryVTT Module Page**: [Link to module listing]
- **Discord Support**: [Link to Discord server]
- **Documentation Wiki**: [Link to wiki]
