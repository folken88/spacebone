/**
 * @fileoverview Base AI Provider Abstract Class
 * 
 * This file defines the abstract base class that all AI providers must implement.
 * It ensures a consistent interface across different AI services (OpenAI, Anthropic, Google, etc.)
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

/**
 * Abstract base class for AI providers
 * All AI provider implementations must extend this class and implement its abstract methods
 * 
 * @abstract
 * @class BaseProvider
 */
export class BaseProvider {
    /**
     * Create a new AI provider instance
     * @param {Object} config - Provider configuration
     * @param {string} config.apiKey - API key for the service
     * @param {string} config.endpoint - API endpoint URL
     * @param {string} config.model - Model name to use
     * @param {Object} config.defaultOptions - Default options for requests
     */
    constructor(config) {
        if (this.constructor === BaseProvider) {
            throw new Error('BaseProvider is abstract and cannot be instantiated directly');
        }
        
        this.config = {
            apiKey: config.apiKey || '',
            endpoint: config.endpoint || '',
            model: config.model || '',
            defaultOptions: config.defaultOptions || {},
            ...config
        };
        
        this.isConfigured = this.validateConfiguration();
    }

    /**
     * Validate the provider configuration
     * @returns {boolean} True if configuration is valid
     * @abstract
     */
    validateConfiguration() {
        throw new Error('validateConfiguration() must be implemented by subclass');
    }

    /**
     * Generate an item using the AI provider
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @param {string} context.itemType - Type of item (weapon, armor, equipment, etc.)
     * @param {number} context.level - Suggested item level
     * @param {string} context.region - Regional flavor
     * @param {Object} context.constraints - Additional constraints
     * @returns {Promise<Object>} Generated item data
     * @abstract
     */
    async generateItem(prompt, context = {}) {
        throw new Error('generateItem() must be implemented by subclass');
    }

    /**
     * Test the connection to the AI provider
     * @returns {Promise<boolean>} True if connection is successful
     * @abstract
     */
    async testConnection() {
        throw new Error('testConnection() must be implemented by subclass');
    }

    /**
     * Get the display name of this provider
     * @returns {string} Human-readable provider name
     * @abstract
     */
    static getDisplayName() {
        throw new Error('getDisplayName() must be implemented by subclass');
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     * @abstract
     */
    static getId() {
        throw new Error('getId() must be implemented by subclass');
    }

    /**
     * Get default configuration for this provider
     * @returns {Object} Default configuration object
     * @abstract
     */
    static getDefaultConfig() {
        throw new Error('getDefaultConfig() must be implemented by subclass');
    }

    /**
     * Get available models for this provider
     * @returns {Array<Object>} Array of model objects with {id, name, description}
     * @abstract
     */
    static getAvailableModels() {
        throw new Error('getAvailableModels() must be implemented by subclass');
    }

    /**
     * Build the system prompt for item generation
     * @param {Object} context - Generation context
     * @returns {string} System prompt
     * @protected
     */
    buildSystemPrompt(context) {
        return `You are an expert Pathfinder 1e item creator. Fill out the item template below based on the user's request. Use your knowledge of Golarion lore and Pathfinder 1e mechanics to create balanced, interesting items.

## TEMPLATE INSTRUCTIONS:
- Replace [FIELD_NAME] with appropriate values
- For simple items ("+1 longsword"), use standard pricing and mechanics
- For regional items ("from Cheliax"), add appropriate cultural flavor
- For legendary items ("once worn by Iomedae"), create powerful abilities and high-level mechanics
- Calculate prices using standard Pathfinder 1e formulas
- Include spell-like abilities when appropriate (format as separate SPELL_ABILITY entries)
- Consider special materials when appropriate:
  * Mithral: Half weight, lighter armor category, higher cost
  * Adamantine: Extremely durable, bypasses hardness, damage reduction
  * Cold Iron: Effective against fey and demons
  * Silver: Effective against lycanthropes and some undead
  * Darkwood: Light magical wood for shields/hafts
  * Dragonhide: Dragon scales with energy resistance
  * Custom materials: Sea-Steel (underwater combat), Skymetal (Numerian tech), Living Steel (self-repairing)

## CONTEXT:
- Item Type: ${context.itemType || '[AUTO-DETECT]'}
- Level: ${context.level || '[AUTO-DETERMINE]'}
- Region: ${context.region || '[AUTO-DETERMINE]'}

Fill out this template and return it EXACTLY as shown (keep all field names and formatting):

=== ITEM TEMPLATE START ===
NAME: [Item Name]
TYPE: [weapon/armor/equipment/consumable]
SUBTYPE: [longsword/breastplate/ring/wand/etc]
MATERIAL: [Standard/Mithral/Adamantine/Cold Iron/Silver/Darkwood/etc, or leave blank for standard]
PRICE: [Gold piece value]
WEIGHT: [Weight in pounds]
ENHANCEMENT: [0-5 for weapons/armor, or N/A]
CASTER_LEVEL: [1-20]
AURA: [school and strength, e.g. "moderate transmutation"]

DESCRIPTION: [Rich description with lore, appearance, and mechanics. Include regional/historical context if relevant.]

MECHANICAL_EFFECTS: [Complete mechanical description including:
- Bonuses: "+2 wisdom", "+5 stealth", "+3 to all saves"
- Conditional bonuses: "+5 stealth in forests", "+3 vs undead"
- Special abilities: spell-like abilities, damage reduction, resistances
- Activation methods: command word, use-activated, continuous
Be specific with numbers and conditions.]

CREATION_REQUIREMENTS: [Feats and spells needed to create this item]
CREATION_COST: [Half the item's price in gold]

SPELL_ABILITY_1: [NAME: Spell Name | ACTIVATION: standard action | USES: 1/day | CASTER_LEVEL: 15 | DESCRIPTION: What this spell does mechanically]
SPELL_ABILITY_2: [Leave blank if no second ability, or add another if needed]
SPELL_ABILITY_3: [Leave blank if no third ability, or add another if needed]
=== ITEM TEMPLATE END ===

IMPORTANT: Return ONLY the filled template, starting with "=== ITEM TEMPLATE START ===" and ending with "=== ITEM TEMPLATE END ===". Do not include any other text or explanations.`;
    }

    /**
     * Parse and validate the AI response
     * @param {string} response - Raw AI response
     * @returns {Object} Parsed and validated item data
     * @protected
     */
    parseResponse(response) {
        try {
            // Debug: Log the full response to see what we're getting
            console.log('[Spacebone Debug] Full LLM Response:', response);
            console.log('[Spacebone Debug] Response type:', typeof response);
            console.log('[Spacebone Debug] Response length:', response ? response.length : 'null/undefined');
            
            // Extract template content between markers
            const templateMatch = response.match(/=== ITEM TEMPLATE START ===([\s\S]*?)=== ITEM TEMPLATE END ===/);
            if (!templateMatch) {
                console.log('[Spacebone Debug] No template markers found. Trying fallback to JSON parsing...');
                
                // Fallback: Try to parse as JSON (for backward compatibility)
                try {
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const itemData = JSON.parse(jsonMatch[0]);
                        console.log('[Spacebone Debug] Successfully parsed as JSON:', itemData);
                        return this.convertJsonToTemplate(itemData);
                    }
                } catch (jsonError) {
                    console.log('[Spacebone Debug] JSON parsing also failed:', jsonError);
                }
                
                throw new Error('No template found in response. Response should be between === ITEM TEMPLATE START === and === ITEM TEMPLATE END === markers.');
            }

            const templateContent = templateMatch[1].trim();
            const itemData = this.parseTemplate(templateContent);
            
            // Validate required fields
            const requiredFields = ['name', 'type', 'description'];
            for (const field of requiredFields) {
                if (!itemData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            return itemData;

        } catch (error) {
            this.debug('Failed to parse AI response:', error);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Parse the filled template into structured data
     * @param {string} templateContent - Template content between markers
     * @returns {Object} Parsed item data
     * @private
     */
    parseTemplate(templateContent) {
        const itemData = {
            abilities: [],
            spellLikeAbilities: [],
            mechanical: {}
        };

        // Parse each line of the template
        const lines = templateContent.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('//')) continue;

            // Parse standard fields
            if (trimmedLine.startsWith('NAME:')) {
                itemData.name = this.extractValue(trimmedLine, 'NAME:');
            } else if (trimmedLine.startsWith('TYPE:')) {
                itemData.type = this.extractValue(trimmedLine, 'TYPE:');
            } else if (trimmedLine.startsWith('SUBTYPE:')) {
                itemData.subType = this.extractValue(trimmedLine, 'SUBTYPE:');
            } else if (trimmedLine.startsWith('MATERIAL:')) {
                itemData.material = this.extractValue(trimmedLine, 'MATERIAL:');
            } else if (trimmedLine.startsWith('PRICE:')) {
                itemData.price = this.parseNumber(this.extractValue(trimmedLine, 'PRICE:'));
            } else if (trimmedLine.startsWith('WEIGHT:')) {
                itemData.weight = this.parseNumber(this.extractValue(trimmedLine, 'WEIGHT:'));
            } else if (trimmedLine.startsWith('ENHANCEMENT:')) {
                const enhancement = this.extractValue(trimmedLine, 'ENHANCEMENT:');
                itemData.enhancement = enhancement.toLowerCase() === 'n/a' ? 0 : this.parseNumber(enhancement);
            } else if (trimmedLine.startsWith('CASTER_LEVEL:')) {
                itemData.casterLevel = this.parseNumber(this.extractValue(trimmedLine, 'CASTER_LEVEL:'));
            } else if (trimmedLine.startsWith('AURA:')) {
                itemData.aura = this.extractValue(trimmedLine, 'AURA:');
            } else if (trimmedLine.startsWith('DESCRIPTION:')) {
                itemData.description = this.extractValue(trimmedLine, 'DESCRIPTION:');
            } else if (trimmedLine.startsWith('MECHANICAL_EFFECTS:')) {
                itemData.mechanical.effects = this.extractValue(trimmedLine, 'MECHANICAL_EFFECTS:');
            } else if (trimmedLine.startsWith('CREATION_REQUIREMENTS:')) {
                itemData.requirements = this.extractValue(trimmedLine, 'CREATION_REQUIREMENTS:');
            } else if (trimmedLine.startsWith('CREATION_COST:')) {
                itemData.creationCost = this.parseNumber(this.extractValue(trimmedLine, 'CREATION_COST:'));
            } else if (trimmedLine.startsWith('SPELL_ABILITY_')) {
                const spellAbility = this.parseSpellAbility(trimmedLine);
                if (spellAbility) {
                    itemData.spellLikeAbilities.push(spellAbility);
                }
            }
        }

        // Set defaults for missing fields
        itemData.level = itemData.level || this.estimateLevel(itemData.price);
        itemData.price = itemData.price || 0;
        itemData.weight = itemData.weight || 0;
        itemData.enhancement = itemData.enhancement || 0;
        itemData.casterLevel = itemData.casterLevel || 1;
        itemData.aura = itemData.aura || 'faint universal';

        return itemData;
    }

    /**
     * Extract value after field name
     * @param {string} line - Template line
     * @param {string} fieldName - Field name to extract
     * @returns {string} Extracted value
     * @private
     */
    extractValue(line, fieldName) {
        return line.substring(fieldName.length).trim();
    }

    /**
     * Parse number from string, handling various formats
     * @param {string} value - String to parse
     * @returns {number} Parsed number
     * @private
     */
    parseNumber(value) {
        if (!value) return 0;
        // Remove common non-numeric characters
        const cleaned = value.toString().replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Parse spell ability from template line
     * @param {string} line - Template line with spell ability
     * @returns {Object|null} Parsed spell ability or null if invalid
     * @private
     */
    parseSpellAbility(line) {
        // Extract content after SPELL_ABILITY_X:
        const content = line.substring(line.indexOf(':') + 1).trim();
        
        // Skip if empty or placeholder
        if (!content || content.includes('[') || content.toLowerCase().includes('leave blank')) {
            return null;
        }

        // Parse the format: NAME: Spell Name | ACTIVATION: action | USES: 1/day | etc.
        const parts = content.split('|').map(p => p.trim());
        const ability = {};

        for (const part of parts) {
            if (part.startsWith('NAME:')) {
                ability.name = part.substring(5).trim();
            } else if (part.startsWith('ACTIVATION:')) {
                ability.activation = part.substring(11).trim();
            } else if (part.startsWith('USES:')) {
                ability.uses = part.substring(5).trim();
            } else if (part.startsWith('CASTER_LEVEL:')) {
                ability.casterLevel = this.parseNumber(part.substring(13).trim());
            } else if (part.startsWith('DESCRIPTION:')) {
                ability.description = part.substring(12).trim();
            }
        }

        return ability.name ? ability : null;
    }

    /**
     * Estimate item level based on price
     * @param {number} price - Item price in gold
     * @returns {number} Estimated level
     * @private
     */
    estimateLevel(price) {
        if (price < 1000) return 1;
        if (price < 4000) return 3;
        if (price < 16000) return 7;
        if (price < 36000) return 11;
        if (price < 64000) return 15;
        return 20;
    }

    /**
     * Convert JSON format to template format for backward compatibility
     * @param {Object} jsonData - JSON item data
     * @returns {Object} Template-formatted item data
     * @private
     */
    convertJsonToTemplate(jsonData) {
        console.log('[Spacebone Debug] Converting JSON to template format');
        return {
            name: jsonData.name || 'Unknown Item',
            type: jsonData.type || 'equipment',
            subType: jsonData.subType || '',
            price: jsonData.price || 0,
            weight: jsonData.weight || 0,
            enhancement: jsonData.enhancement || 0,
            casterLevel: jsonData.casterLevel || 1,
            aura: jsonData.aura || 'faint universal',
            description: jsonData.description || 'A mysterious item.',
            requirements: jsonData.requirements || '',
            creationCost: jsonData.creationCost || 0,
            abilities: jsonData.abilities || [],
            mechanical: jsonData.mechanical || {},
            spellLikeAbilities: jsonData.spellLikeAbilities || [],
            level: jsonData.level || this.estimateLevel(jsonData.price || 0)
        };
    }

    /**
     * Handle API errors consistently
     * @param {Error} error - The error to handle
     * @param {string} operation - The operation that failed
     * @throws {Error} Formatted error
     * @protected
     */
    handleError(error, operation) {
        const providerName = this.constructor.getDisplayName();
        let message = `${providerName} ${operation} failed: `;
        
        if (error.response) {
            // HTTP error
            message += `HTTP ${error.response.status} - ${error.response.statusText}`;
            if (error.response.data && error.response.data.error) {
                message += ` - ${error.response.data.error.message || error.response.data.error}`;
            }
        } else if (error.request) {
            // Network error
            message += 'Network error - check your internet connection and API endpoint';
        } else {
            // Other error
            message += error.message;
        }
        
        throw new Error(message);
    }

    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     * @param {any} data - Additional data to log
     * @protected
     */
    debug(message, data = null) {
        if (game.settings.get('folken-games-spacebone', 'debugMode')) {
            console.log(`[${this.constructor.getDisplayName()}] ${message}`, data);
        }
    }
}
