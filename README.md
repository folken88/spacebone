# Spacebone Item Creator

An AI-powered item and actor creation module for FoundryVTT's Pathfinder 1e and 2e systems. Create detailed magic items and characters using natural language prompts with support for multiple AI providers.

## Features

### 🤖 Multiple AI Provider Support
- **OpenAI GPT-5** - Latest and most advanced model (2025)
- **Anthropic Claude 4** - Excellent reasoning and coding capabilities
- **Google Gemini 2.0** - Multimodal AI with extended context
- **Local LLMs** - Ollama, LM Studio, and other OpenAI-compatible services

### 🎯 Intelligent Item & Actor Generation
- Natural language prompts for **items** (weapons, armor, equipment, consumables) and **actors** (PF1 & PF2e)
- Automatic Pathfinder 1e/2e rule compliance
- Regional flavor integration (Golarion settings)
- Level-appropriate pricing, mechanics, and class levels
- Rich descriptions with lore and appearance

### 🎨 Modern Interface
- Dark glassmorphism design
- Intuitive item configuration controls
- Example prompts for inspiration
- Real-time AI generation status
- Mobile-responsive layout

### ⚙️ Advanced Configuration
- Per-provider model selection
- Customizable generation parameters
- Connection testing and validation
- Usage analytics and history
- Debug mode for troubleshooting

## Installation

1. Download the module from the FoundryVTT modules page
2. Extract to your `Data/modules` folder
3. Enable "Spacebone Item Creator" in Module Management
4. Configure your preferred AI provider in Module Settings

## Quick Start

### 1. Configure AI Provider

Navigate to **Module Settings** → **Spacebone Item Creator**:

```
LLM API Provider: OpenAI GPT (or your preferred provider)
API Key: your-api-key-here
Model Name: gpt-5 (or desired model)
```

### 2. Create Your First Item

1. Open the **Items** sidebar tab
2. Click the **🦴 Spacebone** button
3. Enter a prompt like: *"A +1 flaming longsword forged in Alkenstar"*
4. Adjust any specific requirements if needed
5. Click **Generate Item**

### 3. Create an Actor (PF1 or PF2e)

1. Open the **Actors** sidebar tab
2. Click the **🦴 Spacebone** button
3. Enter a prompt like: *"A level 5 cleric of Sarenrae from Katapesh"* or *"A level 3 alkenstar rogue"*
4. Click **Create Actor**

### 4. Advanced Usage

Use the configuration panel to specify:
- **Item Type**: Weapon, Armor, Equipment, Consumable
- **Item Level**: 1-20 (affects pricing and power)
- **Regional Flavor**: Cheliax, Varisia, Alkenstar, etc.
- **Specific Requirements**: Enhancement levels, materials, etc.

For **actor creation**, prompts can include level, class, race/ancestry, region, and personality. The AI generates PCs or NPCs based on detail level.

## API Provider Setup

### OpenAI GPT
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set Provider: `OpenAI GPT`
3. Set Model: `gpt-4o` (recommended) or `gpt-4-turbo`
4. Test connection

### Anthropic Claude
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set Provider: `Anthropic Claude`
3. Set Model: `claude-4-sonnet` (recommended)
4. Test connection

### Google Gemini
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set Provider: `Google Gemini`
3. Set Model: `gemini-2.0-pro` (recommended)
4. Test connection

### Local LLMs (Ollama/LM Studio)
1. Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
2. Download a model (e.g., `ollama pull llama3.2`)
3. Set Provider: `Local LLM (Ollama/LM Studio)`
4. Set Endpoint: `http://localhost:11434/v1/chat/completions` (Ollama default)
5. Set Model: `llama3.2` (or your downloaded model)
6. Test connection (no API key required)

## Example Prompts

### Simple Prompts
- "A +2 keen rapier"
- "A cloak of elvenkind"
- "A ring of protection +1"

### Detailed Prompts
- "A masterwork composite longbow crafted by Varisian rangers, with intricate carvings"
- "A breastplate blessed by paladins of Iomedae, glowing faintly with divine light"
- "A Chelish noble's signet ring that grants advantage in social situations"

### Regional Flavor
- "An Alkenstar firearm with clockwork mechanisms"
- "A Numerian artifact with strange technological properties"
- "An Osirian ceremonial khopesh inscribed with hieroglyphs"

## File Structure

```
folken-games-spacebone/
├── scripts/
│   ├── api/
│   │   ├── providers/           # AI provider implementations
│   │   │   ├── base-provider.js     # Abstract base class
│   │   │   ├── openai-provider.js   # OpenAI GPT support
│   │   │   ├── anthropic-provider.js # Anthropic Claude support
│   │   │   ├── gemini-provider.js   # Google Gemini support
│   │   │   └── local-provider.js    # Local LLM support
│   │   ├── provider-manager.js  # Provider registration and management
│   │   └── llm-interface.js     # High-level API interface
│   ├── factories/
│   │   ├── item-factory.js      # PF1 item data construction
│   │   ├── pf1-actor-factory.js # PF1 actor data construction
│   │   ├── pf2-item-factory.js  # PF2e item data construction
│   │   └── pf2-actor-factory.js # PF2e actor data construction
│   ├── ui/
│   │   └── spacebone-ui.js      # User interface management
│   ├── utils/
│   │   └── folder-manager.js    # Item organization utilities
│   └── spacebone.js             # Main module class
├── styles/
│   └── spacebone.css            # Glassmorphism UI styling
├── templates/
│   └── (future handlebars templates)
├── lang/
│   └── en.json                  # English translations
├── art/
│   └── images/
│       └── icon_spacebone.webp  # Module icon
├── module.json                  # FoundryVTT module manifest
├── README.md                    # This file
└── CHANGELOG.md                 # Version history
```

## Architecture

### Provider System
The module uses a modular provider architecture:

1. **BaseProvider** - Abstract class defining the provider interface
2. **Concrete Providers** - Implementations for specific AI services
3. **ProviderManager** - Handles registration, selection, and lifecycle
4. **SpaceboneAPI** - High-level interface for the UI layer

### Data Flow
- **Items**: `User Input → SpaceboneUI → SpaceboneAPI → ProviderManager → AI Provider → Item Data → ItemFactory / PF2ItemFactory → FoundryVTT Item`
- **Actors**: `User Input → SpaceboneUI → SpaceboneAPI → ProviderManager → AI Provider → Actor Data → PF1ActorFactory / PF2ActorFactory → FoundryVTT Actor`

## Development

### Adding New Providers

1. Create a new provider class extending `BaseProvider`:

```javascript
import { BaseProvider } from './base-provider.js';

export class MyProvider extends BaseProvider {
    static getId() { return 'myprovider'; }
    static getDisplayName() { return 'My AI Service'; }
    
    async generateItem(prompt, context) {
        // Implementation
    }
    
    // Other required methods...
}
```

2. Register in `provider-manager.js`:

```javascript
import { MyProvider } from './providers/my-provider.js';

// In constructor:
this.registerProvider(MyProvider);
```

### Debugging

Enable debug mode in module settings to see detailed logs:
- API requests and responses
- Provider initialization
- Error details
- Performance metrics

## Troubleshooting

### Common Issues

**"No AI provider configured"**
- Go to Module Settings and configure an AI provider
- Ensure API key is valid and has sufficient credits/quota

**"Invalid response format"**
- Try a different model or provider
- Check if the API service is experiencing issues
- Enable debug mode to see raw responses

**"Connection failed"**
- Verify API endpoint URL is correct
- Check internet connection
- For local LLMs, ensure the service is running

**Button doesn't appear**
- Ensure you're logged in as a GM
- Check that the module is enabled
- Actor button shows only for PF1 and PF2e systems; Items button shows for both
- Try refreshing the page

**Armor not showing in inventory / ghost encumbrance**
- Fixed in recent versions: armor is now created as `type: "armor"` with correct slot, `baseTypes`, and `equipmentSubtype`. If you have old buggy armor (type "equipment", invisible but affecting encumbrance), delete it via console or replace it.

**GPT-5 Model Issues ("max_tokens not supported")**
- Go to Module Settings for "Folken Games Spacebone"
- Change the Model field from `gpt-5` to `gpt-4o`
- Save settings and try again
- Note: GPT-5 reasoning models use all tokens for internal reasoning and often return empty responses

### Debug Mode

Enable in Module Settings to see:
- Detailed request/response logs
- Provider initialization status
- Performance metrics
- Error stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style and documentation standards
4. Add tests for new functionality
5. Submit a pull request

## License

This module is licensed under the MIT License. See LICENSE file for details.

## Support

- **Issues**: Report bugs on GitHub Issues
- **Discord**: Join the FoundryVTT community discord
- **Documentation**: Check the wiki for advanced usage

## Credits

- **Development**: Spacebone Development Team
- **Art Inspiration**: [Jim Nelson Art - Eye of Thkaalujin](https://jimnelsonart.blogspot.com/2014/01/eye-of-thkaalujin.html) - The "Spacebone" name and concept draws inspiration from this evocative artwork
- **Module Inspiration**: pf1-magic-item-gen module
- **AI Providers**: OpenAI, Anthropic, Google, Open Source LLM community
- **FoundryVTT**: For the amazing platform
- **Pathfinder**: Paizo Inc. for the game system

---

*Generate amazing items and characters for your Pathfinder campaigns with the power of AI!* 🦴✨