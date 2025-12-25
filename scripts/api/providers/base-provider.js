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
        // Detect system from context or game
        const systemId = context.systemId || game?.system?.id || 'pf1';
        const isPF2e = systemId === 'pf2e';
        
        if (isPF2e) {
            return this.buildPF2SystemPrompt(context);
        } else {
            return this.buildPF1SystemPrompt(context);
        }
    }
    
    /**
     * Build PF1 system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt
     * @protected
     */
    buildPF1SystemPrompt(context) {
        return `You are an expert Pathfinder 1e item creator. You MUST follow the exact format specified below. Any deviation from this format will cause the system to fail.

## CRITICAL REQUIREMENTS:
- You MUST return ONLY the template between the markers
- You MUST NOT include JSON, markdown code blocks, or any other formatting
- You MUST NOT add explanatory text before or after the template
- You MUST fill in ALL fields, even if with simple values
- Your response MUST start with "=== ITEM TEMPLATE START ===" and end with "=== ITEM TEMPLATE END ==="
- **CRITICAL**: The NAME field must contain ONLY the item name. NO descriptions, mechanical effects, or additional text on the NAME line!

## ACCURATE PF1 WEAPON STATS (USE EXACTLY):
**Crossbows:**
- Light Crossbow: 1d8 damage, 19-20/x2 crit, 80 ft range, 4 lbs, 35 gp
- Heavy Crossbow: 1d10 damage, 19-20/x2 crit, 120 ft range, 8 lbs, 50 gp

**Bows:**
- Shortbow: 1d6 damage, x3 crit, 60 ft range, 2 lbs, 30 gp
- Longbow: 1d8 damage, x3 crit, 100 ft range, 3 lbs, 75 gp
- Composite bows add STR bonus to damage

**Melee Weapons:**
- Longsword: 1d8 damage, 19-20/x2 crit, 4 lbs, 15 gp
- Greatsword: 2d6 damage, 19-20/x2 crit, 8 lbs, 50 gp
- Rapier: 1d6 damage, 18-20/x2 crit, 2 lbs, 20 gp

**Masterwork Weapons:**
- Add +150 gp to base cost (so masterwork heavy crossbow = 200 gp)
- Never mention enhancement bonus in MECHANICAL_EFFECTS (handled by system)

**Elemental Damage Rules:**
When the user mentions elemental themes, ADD the appropriate damage:
- **Fire/Flame/Burning**: Add "+1d6 fire damage" to weapon attacks
- **Cold/Ice/Frost/Freezing**: Add "+1d6 cold damage" to weapon attacks  
- **Electricity/Lightning/Thunder/Shock**: Add "+1d6 electricity damage" to weapon attacks
- **Acid/Corrosive**: Add "+1d6 acid damage" to weapon attacks
- **Force**: Add "+1d6 force damage" to weapon attacks
- **Sonic/Sound**: Add "+1d6 sonic damage" to weapon attacks

**Examples:**
- "Flaming sword" → "+1d6 fire damage on attacks"
- "Frost axe" → "+1d6 cold damage on attacks"  
- "Thunderstrike hammer" → "+1d6 electricity damage on attacks"
- "Acid blade" → "+1d6 acid damage on attacks"

**Consumable Item Rules:**
For potions, scrolls, and wands, include SPELL_ABILITY entries that replicate spells:

**Potions**: Single-use, personal range spells only (1-4th level spells)
- "Potion of Cure Light Wounds" → SPELL_ABILITY: Cure Light Wounds (1d8+1 healing)
- "Potion of Bull's Strength" → SPELL_ABILITY: Bull's Strength (+4 STR for 5 min)

**Scrolls**: Any spell up to 9th level, requires caster to use
- "Scroll of Fireball" → SPELL_ABILITY: Fireball (8d6 fire damage, 20 ft radius)
- "Scroll of Teleport" → SPELL_ABILITY: Teleport (instant travel)

**Wands**: 50 charges, spells up to 4th level
- "Wand of Magic Missile" → SPELL_ABILITY: Magic Missile (1d4+1 force per missile)
- "Wand of Cure Moderate Wounds" → SPELL_ABILITY: Cure Moderate Wounds (2d8+3 healing)

## TEMPLATE INSTRUCTIONS:
- Replace [FIELD_NAME] with appropriate values
- For simple items ("+1 longsword"), use standard pricing and mechanics
- For regional items ("from Cheliax"), add appropriate cultural flavor
- For legendary items ("once worn by Iomedae"), create powerful abilities and high-level mechanics
- Calculate prices using standard Pathfinder 1e formulas
- Include spell-like abilities when appropriate (format as separate SPELL_ABILITY entries)
- **For consumables (potions/scrolls/wands)**: Include the spell effect they replicate
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

## MANDATORY RESPONSE FORMAT:
Your response must be EXACTLY this template with filled values. Do NOT use JSON format. Do NOT use code blocks. Do NOT add extra text:

=== ITEM TEMPLATE START ===
NAME: [ONLY the item name - nothing else, no descriptions or mechanical text]
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
- Elemental damage: "+1d6 fire damage", "+1d6 cold damage", etc. (if theme suggests it)
- Special abilities: spell-like abilities, damage reduction, resistances
- Activation methods: command word, use-activated, continuous
Be specific with numbers and conditions.]

CREATION_REQUIREMENTS: [Feats and spells needed to create this item]
CREATION_COST: [Half the item's price in gold]

SPELL_ABILITY_1: [NAME: Spell Name | ACTIVATION: standard action | USES: 1/day | CASTER_LEVEL: 15 | DESCRIPTION: What this spell does mechanically]
SPELL_ABILITY_2: [Leave blank if no second ability, or add another if needed]
SPELL_ABILITY_3: [Leave blank if no third ability, or add another if needed]
=== ITEM TEMPLATE END ===

## EXAMPLES OF CORRECT NAME FIELD:
✅ CORRECT: "NAME: Flame Tongue"
✅ CORRECT: "NAME: Cloak of Elvenkind"
✅ CORRECT: "NAME: Holy Hammer of Thassilon"

❌ WRONG: "NAME: Holy Hammer of Thassilon are considered good-aligned for the purposes of overcoming damage reduction"
❌ WRONG: "NAME: Flame Tongue (functions as a +1 flaming longsword)"
❌ WRONG: "NAME: Cloak of Elvenkind that grants +5 stealth"

CRITICAL: Your entire response must be ONLY the filled template above. Nothing else. No JSON. No code blocks. No explanations. The system expects this exact format and will fail if you deviate from it.`;
    }
    
    /**
     * Build PF2e system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt
     * @protected
     */
    buildPF2SystemPrompt(context) {
        return `You are an expert Pathfinder 2e item creator. You MUST follow the exact format specified below. Any deviation from this format will cause the system to fail.

## CRITICAL REQUIREMENTS:
- You MUST return ONLY the template between the markers
- You MUST NOT include JSON, markdown code blocks, or any other formatting
- You MUST NOT add explanatory text before or after the template
- You MUST fill in ALL fields, even if with simple values
- Your response MUST start with "=== ITEM TEMPLATE START ===" and end with "=== ITEM TEMPLATE END ==="
- **CRITICAL**: The NAME field must contain ONLY the item name. NO descriptions, mechanical effects, or additional text on the NAME line!

## PATHFINDER 2E ITEM SYSTEM:
PF2e uses a different system than PF1:
- **Item Levels**: Items have levels 1-20 that determine power and price
- **Traits**: Items have traits (magical, consumable, etc.) that define their properties
- **Runes**: Weapons and armor use runes (potency, striking, property runes) instead of enhancement bonuses
- **Price Formula**: Items follow strict level-based pricing (see below)
- **Rarity**: common, uncommon, rare, unique
- **Firearms**: PF2e includes firearms (pistols, guns, etc.) from the Guns & Gears supplement - these are VALID items
- **Advanced Weapons**: PF2e includes advanced weapons beyond simple/martial - these are VALID items

## PF2E WEAPON STATS:
**Simple Weapons:**
- Dagger: 1d4 P, agile, finesse, thrown 10 ft, bulk L, 2 sp
- Shortsword: 1d6 P, agile, finesse, bulk L, 9 sp
- Club: 1d4 B, bulk L, 0 sp
- Mace: 1d4 B, shove, bulk L, 1 sp

**Martial Weapons:**
- Longsword: 1d8 S, versatile P, bulk 1, 1 gp
- Greatsword: 1d12 S, two-hand d12, bulk 2, 2 gp
- Rapier: 1d6 P, deadly d8, finesse, disarm, bulk 1, 2 gp
- Longbow: 1d8 P, deadly d10, range 100 ft, reload 0, bulk 2, 3 gp
- Kukri: 1d4 S, agile, finesse, trip, bulk L, 2 gp

**Advanced Weapons (including Firearms):**
- Pistol: 1d6 P, fatal d8, range 30 ft, reload 1, bulk L, 12 gp (Alkenstar/Guns & Gears)
- Arquebus: 1d8 P, fatal d10, range 150 ft, reload 2, bulk 2, 20 gp
- Musket: 1d10 P, fatal d12, range 180 ft, reload 2, bulk 2, 25 gp
- Pepperbox: 1d6 P, fatal d8, range 30 ft, reload 1, bulk L, 15 gp
- Revolver: 1d6 P, fatal d8, range 30 ft, reload 1, bulk L, 18 gp

**IMPORTANT**: PF2e includes firearms in the Guns & Gears supplement. If the user requests a firearm, pistol, gun, or similar weapon, you MUST create it as an advanced weapon with appropriate stats. Do NOT refuse to create firearms - they are valid PF2e items.

**Weapon Runes:**
- **Potency Runes**: +1 (level 2), +2 (level 10), +3 (level 16) - adds to attack rolls
- **Striking Runes**: Striking (level 4), Greater Striking (level 12), Major Striking (level 19) - increases damage dice
- **Property Runes**: Flaming, Frost, Shock, etc. - add special effects

## PF2E ARMOR STATS:
**Light Armor:**
- Padded: +1 AC, +5 Dex, 0 check, 0 speed, bulk L, 4 sp
- Leather: +1 AC, +4 Dex, 0 check, 0 speed, bulk L, 2 gp
- Studded Leather: +2 AC, +3 Dex, -1 check, 0 speed, bulk L, 3 gp

**Medium Armor:**
- Hide: +2 AC, +2 Dex, -2 check, -5 speed, bulk 2, 2 gp
- Chain Shirt: +2 AC, +2 Dex, -2 check, -5 speed, bulk 2, 5 gp
- Breastplate: +3 AC, +1 Dex, -2 check, -5 speed, bulk 2, 8 gp

**Heavy Armor:**
- Splint Mail: +4 AC, +0 Dex, -3 check, -10 speed, bulk 3, 30 gp
- Full Plate: +5 AC, +0 Dex, -3 check, -10 speed, bulk 4, 30 gp

**Armor Runes:**
- **Potency Runes**: +1 (level 5), +2 (level 11), +3 (level 18) - adds to AC
- **Resilient Runes**: Resilient (level 8), Greater Resilient (level 14), Major Resilient (level 20) - adds to saves

## PF2E ITEM LEVEL & PRICING:
Items have levels 1-20. Price scales with level:
- Level 1-2: 3-12 gp
- Level 3-4: 20-50 gp
- Level 5-6: 100-250 gp
- Level 7-8: 500-1,000 gp
- Level 9-10: 2,000-5,000 gp
- Level 11-12: 10,000-25,000 gp
- Level 13-14: 50,000-100,000 gp
- Level 15-16: 200,000-500,000 gp
- Level 17-18: 1,000,000-2,000,000 gp
- Level 19-20: 4,000,000+ gp

## PF2E TRAITS:
Common traits: magical, consumable, alchemical, elixir, potion, scroll, talisman, invested, worn, held, two-hand, finesse, agile, versatile, thrown, reach, trip, disarm, etc.

## TEMPLATE INSTRUCTIONS:
- Replace [FIELD_NAME] with appropriate values
- For simple items, use appropriate level (1-3 for basic items)
- For magical items, use level 4+ with appropriate runes/traits
- Calculate prices using PF2e level-based pricing
- Include appropriate traits for the item type
- For weapons/armor, specify runes if magical
- Use PF2e terminology (not PF1 terms like "enhancement bonus")
- **CRITICAL**: You MUST create ANY item the user requests, even if it's unusual, advanced, or from supplements
- **Firearms are valid**: Pistols, guns, firearms are valid PF2e items (Guns & Gears supplement)
- **Never refuse**: If the user asks for an item, create it following PF2e rules - do NOT say you cannot create it

## CONTEXT:
- Item Type: ${context.itemType || '[AUTO-DETECT]'}
- Level: ${context.level || '[AUTO-DETERMINE]'}
- Region: ${context.region || '[AUTO-DETERMINE]'}

## MANDATORY RESPONSE FORMAT:
Your response must be EXACTLY this template with filled values. Do NOT use JSON format. Do NOT use code blocks. Do NOT add extra text:

=== ITEM TEMPLATE START ===
NAME: [ONLY the item name - nothing else, no descriptions or mechanical text]
TYPE: [weapon/armor/equipment/consumable]
SUBTYPE: [longsword/breastplate/ring/potion/etc]
LEVEL: [1-20, appropriate for item power]
RARITY: [common/uncommon/rare/unique]
PRICE: [Gold piece value based on level]
BULK: [L/1/2/3/4/etc - L for light, numbers for heavier]
TRAITS: [comma-separated list: magical, consumable, etc.]

DESCRIPTION: [Rich description with lore, appearance, and mechanics. Include regional/historical context if relevant.]

MECHANICAL_EFFECTS: [Complete mechanical description including:
- For weapons: damage dice, traits, runes (potency, striking, property runes)
- For armor: AC bonus, Dex cap, check penalty, speed penalty, runes
- For equipment: bonuses, special abilities, activation methods
- For consumables: effect description, activation
Use PF2e terminology and mechanics.]

WEAPON_DATA: [If weapon: damage dice (e.g., "1d8"), damage type (P/S/B), weapon traits (finesse, agile, etc.), range if ranged]
ARMOR_DATA: [If armor: AC bonus, Dex cap, check penalty, speed penalty, armor type (light/medium/heavy)]
RUNES: [If magical weapon/armor: list runes like "potency +1, striking, flaming rune"]
=== ITEM TEMPLATE END ===

## EXAMPLES OF CORRECT NAME FIELD:
✅ CORRECT: "NAME: Flaming Longsword"
✅ CORRECT: "NAME: Cloak of Elvenkind"
✅ CORRECT: "NAME: Potion of Healing"

❌ WRONG: "NAME: Flaming Longsword that deals 1d6 fire damage"
❌ WRONG: "NAME: +1 Striking Longsword (functions as a magical weapon)"
❌ WRONG: "NAME: Cloak of Elvenkind that grants +1 to Stealth"

## CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST create ANY item the user requests - NEVER refuse or say you cannot create it
2. Firearms (pistols, guns, etc.) are VALID PF2e items - create them if requested
3. Advanced weapons are VALID PF2e items - create them if requested
4. If unsure about stats, use similar items as reference but create the item requested
5. Your response must be ONLY the filled template - no explanations, no refusals, no apologies
6. If the user asks for a pistol, create a pistol. If they ask for a gun, create a gun. ALWAYS create what they ask for.

CRITICAL: Your entire response must be ONLY the filled template above. Nothing else. No JSON. No code blocks. No explanations. No refusals. The system expects this exact format and will fail if you deviate from it.`;
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
                console.log('[Spacebone Debug] No template markers found in response.');
                console.log('[Spacebone Debug] Expected format: === ITEM TEMPLATE START === ... === ITEM TEMPLATE END ===');
                console.log('[Spacebone Debug] Actual response:', response);
                
                throw new Error('LLM did not follow the required template format. Response must be between === ITEM TEMPLATE START === and === ITEM TEMPLATE END === markers. Please check the LLM configuration and try again.');
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
            // PF2e-specific fields
            else if (trimmedLine.startsWith('LEVEL:')) {
                itemData.level = this.parseNumber(this.extractValue(trimmedLine, 'LEVEL:'));
            } else if (trimmedLine.startsWith('RARITY:')) {
                itemData.rarity = this.extractValue(trimmedLine, 'RARITY:').toLowerCase();
            } else if (trimmedLine.startsWith('BULK:')) {
                itemData.bulk = this.extractValue(trimmedLine, 'BULK:');
            } else if (trimmedLine.startsWith('TRAITS:')) {
                itemData.traits = this.extractValue(trimmedLine, 'TRAITS:');
            } else if (trimmedLine.startsWith('WEAPON_DATA:')) {
                itemData.weaponData = this.extractValue(trimmedLine, 'WEAPON_DATA:');
            } else if (trimmedLine.startsWith('ARMOR_DATA:')) {
                itemData.armorData = this.extractValue(trimmedLine, 'ARMOR_DATA:');
            } else if (trimmedLine.startsWith('RUNES:')) {
                itemData.runes = this.extractValue(trimmedLine, 'RUNES:');
            }
        }

        // Set defaults for missing fields (PF1 defaults)
        if (!itemData.level) {
            itemData.level = itemData.level || this.estimateLevel(itemData.price);
        }
        itemData.price = itemData.price || 0;
        itemData.weight = itemData.weight || 0;
        itemData.enhancement = itemData.enhancement || 0;
        itemData.casterLevel = itemData.casterLevel || 1;
        itemData.aura = itemData.aura || 'faint universal';
        
        // PF2e defaults
        if (!itemData.rarity) {
            itemData.rarity = 'common';
        }
        if (!itemData.bulk) {
            itemData.bulk = 'L';
        }
        if (!itemData.traits) {
            itemData.traits = '';
        }

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
        const value = line.substring(fieldName.length).trim();
        
        // For NAME field specifically, stop at the first sentence or obvious break
        if (fieldName === 'NAME:') {
            // Stop at first period, comma, or other common breaks that indicate extra text
            const stopPatterns = [
                ' are ', ' is ', ' were ', ' was ', ' can ', ' will ', ' would ', ' should ',
                ' that ', ' which ', ' who ', ' whose ', ' when ', ' where ', ' why ', ' how ',
                ', ', '. ', ' - ', ' – ', ' — ', ' (', ' for the purposes of', ' considered'
            ];
            
            for (const pattern of stopPatterns) {
                const index = value.toLowerCase().indexOf(pattern.toLowerCase());
                if (index > 0 && index < 60) { // Only if it's not too early and not too late
                    return value.substring(0, index).trim();
                }
            }
            
            // If no patterns found, but it's suspiciously long (over 60 chars), truncate at reasonable points
            if (value.length > 60) {
                // Look for natural break points
                const words = value.split(' ');
                let truncated = '';
                for (const word of words) {
                    if ((truncated + ' ' + word).length > 50) break;
                    truncated += (truncated ? ' ' : '') + word;
                }
                return truncated || value.substring(0, 50).trim();
            }
        }
        
        return value;
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
        console.log('[Spacebone Debug] Converting JSON to template format:', jsonData);
        
        // Handle both uppercase and lowercase field names from LLM responses
        const getValue = (obj, ...keys) => {
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                    return obj[key];
                }
            }
            return null;
        };
        
        // Extract mechanical effects from MECHANICAL_EFFECTS field
        const mechanicalEffectsText = getValue(jsonData, 'MECHANICAL_EFFECTS', 'mechanical_effects', 'mechanicalEffects', 'mechanical');
        const mechanical = {};
        if (mechanicalEffectsText && typeof mechanicalEffectsText === 'string') {
            mechanical.effects = mechanicalEffectsText;
        }
        
        // Parse enhancement value (remove + if present)
        const enhancementRaw = getValue(jsonData, 'ENHANCEMENT', 'enhancement');
        let enhancement = 0;
        if (enhancementRaw) {
            const enhMatch = String(enhancementRaw).match(/\+?(\d+)/);
            enhancement = enhMatch ? parseInt(enhMatch[1]) : 0;
        }
        
        // Build spell-like abilities from SPELL_ABILITY fields
        const spellLikeAbilities = [];
        for (let i = 1; i <= 3; i++) {
            const spellAbility = getValue(jsonData, `SPELL_ABILITY_${i}`, `spell_ability_${i}`, `spellAbility${i}`);
            if (spellAbility && spellAbility.trim() !== '') {
                spellLikeAbilities.push(spellAbility);
            }
        }
        
        return {
            name: getValue(jsonData, 'NAME', 'name') || 'Unknown Item',
            type: getValue(jsonData, 'TYPE', 'type') || 'equipment',
            subType: getValue(jsonData, 'SUBTYPE', 'subType', 'subtype') || '',
            material: getValue(jsonData, 'MATERIAL', 'material') || 'Standard',
            price: parseInt(getValue(jsonData, 'PRICE', 'price')) || 0,
            weight: parseFloat(getValue(jsonData, 'WEIGHT', 'weight')) || 0,
            enhancement: enhancement,
            casterLevel: parseInt(getValue(jsonData, 'CASTER_LEVEL', 'caster_level', 'casterLevel')) || 1,
            aura: getValue(jsonData, 'AURA', 'aura') || 'faint universal',
            description: getValue(jsonData, 'DESCRIPTION', 'description') || 'A mysterious item.',
            requirements: getValue(jsonData, 'CREATION_REQUIREMENTS', 'creation_requirements', 'requirements') || '',
            creationCost: parseInt(getValue(jsonData, 'CREATION_COST', 'creation_cost', 'creationCost')) || 0,
            abilities: [],
            mechanical: mechanical,
            spellLikeAbilities: spellLikeAbilities,
            level: getValue(jsonData, 'level') || this.estimateLevel(parseInt(getValue(jsonData, 'PRICE', 'price')) || 0)
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
