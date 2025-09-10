/**
 * Item Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper PF1 FoundryVTT items
 * 
 * @author Folken Games
 * @version 1.0.0
 */

import { SPECIAL_MATERIALS, applyMaterialToItem, calculateMaterialCost } from '../data/materials.js';

export class ItemFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a PF1 item from LLM-generated data
     * @param {Object} itemData - Raw item data from LLM
     * @returns {Promise<Object>} PF1-formatted item data
     */
    async createPF1Item(itemData) {
        try {
            let pf1Data;

            // For weapons and armor, start with a base item from compendium
            if (itemData.type === 'weapon' || itemData.type === 'armor') {
                pf1Data = await this.getBaseItemFromCompendium(itemData);
                if (pf1Data) {
                    // Modify the base item with our generated data
                    this.enhanceBaseItem(pf1Data, itemData);
                } else {
                    // Fallback to custom creation if no base found
                    pf1Data = this.buildCustomItem(itemData);
                }
            } else {
                // For equipment/consumables, build from scratch
                pf1Data = this.buildCustomItem(itemData);
            }

            // Validate the created item data
            this.validateItemData(pf1Data);
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log('Spacebone | Created PF1 item data:', pf1Data);
            }

            return pf1Data;

        } catch (error) {
            console.error('Spacebone | Error creating PF1 item:', error);
            throw error;
        }
    }

    /**
     * Get a base item from PF1 compendiums
     * @param {Object} itemData - LLM generated item data
     * @returns {Promise<Object|null>} Base item from compendium or null
     */
    async getBaseItemFromCompendium(itemData) {
        try {
            let packName;
            if (itemData.type === 'weapon') {
                packName = 'pf1.weapons-and-ammo';
            } else if (itemData.type === 'armor') {
                packName = 'pf1.armors-and-shields';
            } else {
                return null;
            }

            const pack = game.packs.get(packName);
            if (!pack) {
                console.warn(`Spacebone | Compendium ${packName} not found`);
                return null;
            }

            const index = await pack.getDocuments();
            
            // Find matching items
            const matchingItems = index.filter(item => {
                if (item.type !== itemData.type) return false;
                
                // Match by name or subtype
                const itemName = item.name.toLowerCase();
                const subType = itemData.subType.toLowerCase();
                
                return itemName.includes(subType) || 
                       subType.includes(itemName) ||
                       item.system.baseTypes?.some(bt => bt.toLowerCase() === subType);
            });
            
            // Prefer standard weapons over exotic variants
            let baseItem = matchingItems.find(item => {
                const itemName = item.name.toLowerCase();
                return !itemName.includes('dwarven') && 
                       !itemName.includes('elven') && 
                       !itemName.includes('orcish') && 
                       !itemName.includes('pelletbow') &&
                       !itemName.includes('repeating');
            });
            
            // Fallback to any match if no standard version found
            if (!baseItem && matchingItems.length > 0) {
                baseItem = matchingItems[0];
            }

            if (baseItem) {
                console.log(`Spacebone | Found base item: ${baseItem.name} for ${itemData.subType}`);
                return baseItem.toObject();
            }

            return null;

        } catch (error) {
            console.error('Spacebone | Error loading base item from compendium:', error);
            return null;
        }
    }

    /**
     * Enhance a base item with LLM-generated data
     * @param {Object} baseItem - Base item from compendium
     * @param {Object} itemData - LLM generated item data
     */
    enhanceBaseItem(baseItem, itemData) {
        // Update basic properties
        baseItem.name = itemData.name;
        baseItem.img = this.getDefaultIcon(itemData.type, itemData.subType, itemData.name);
        
        // Set equipment slot for PF1 system
        if (itemData.type === 'equipment') {
            baseItem.system.slot = this.getEquipmentSlot(itemData.subType, itemData.name);
        }
        
        // Update system data
        baseItem.system.description = {
            value: this.formatDescription(itemData),
            chat: "",
            unidentified: baseItem.system.description?.unidentified || ""
        };
        
        baseItem.system.price = itemData.price || baseItem.system.price;
        baseItem.system.weight.value = itemData.weight || baseItem.system.weight.value;
        
        // Handle masterwork and enhancement following pf1-magic-item-gen pattern
        const isRequestedMasterwork = itemData.name && itemData.name.toLowerCase().includes('masterwork');
        const hasEnhancement = itemData.enhancement && itemData.enhancement > 0;
        const hasMagicalEffects = itemData.mechanical?.effects && itemData.mechanical.effects.trim() !== '';
        
        // Set masterwork status
        if (isRequestedMasterwork || hasEnhancement || hasMagicalEffects) {
            baseItem.system.masterwork = true;
        }
        
        // Add enhancement bonus for weapons/armor
        if (hasEnhancement) {
            if (itemData.type === 'weapon') {
                baseItem.system.enh = itemData.enhancement;
                baseItem.system.masterwork = true;
                if (!baseItem.system.material.addon.includes('magic')) {
                    baseItem.system.material.addon.push('magic');
                }
            } else if (itemData.type === 'armor') {
                // Use proper PF1 armor enhancement path
                baseItem.system.armor = baseItem.system.armor || {};
                baseItem.system.armor.enh = itemData.enhancement;
                baseItem.system.masterwork = true;
                if (!baseItem.system.armor.material) {
                    baseItem.system.armor.material = { addon: [] };
                }
                if (!baseItem.system.armor.material.addon.includes('magic')) {
                    baseItem.system.armor.material.addon.push('magic');
                }
            }
        }
        
        // Set magic flag for any magical effects
        if (hasMagicalEffects || hasEnhancement) {
            if (itemData.type === 'armor') {
                baseItem.system.armor = baseItem.system.armor || {};
                baseItem.system.armor.material = baseItem.system.armor.material || { addon: [] };
                if (!baseItem.system.armor.material.addon.includes('magic')) {
                    baseItem.system.armor.material.addon.push('magic');
                }
            } else {
                if (!baseItem.system.material.addon.includes('magic')) {
                    baseItem.system.material.addon.push('magic');
                }
            }
        }

        // Add special weapon abilities from mechanical effects
        if (itemData.type === 'weapon' && itemData.mechanical?.effects) {
            this.addSpecialWeaponAbilities(baseItem, itemData.mechanical.effects);
        }

        // Detect and apply special materials
        const detectedMaterial = this.detectMaterial(itemData);
        if (detectedMaterial) {
            applyMaterialToItem(baseItem, detectedMaterial);
            // Update price with material cost
            const materialCost = calculateMaterialCost(detectedMaterial, baseItem);
            baseItem.system.price = (baseItem.system.price || 0) + materialCost;
        }

        // Add caster level and aura
        if (itemData.casterLevel) {
            baseItem.system.cl = itemData.casterLevel;
        }
        
        if (itemData.aura) {
            const auraParts = itemData.aura.split(' ');
            baseItem.system.aura = {
                custom: false,
                school: auraParts[1] || 'universal',
                strength: auraParts[0] || 'faint'
            };
        }

        // Add creation requirements and cost
        if (itemData.requirements) {
            baseItem.system.requirements = itemData.requirements;
        }
        if (itemData.creationCost) {
            baseItem.system.creationCost = itemData.creationCost;
        }

        // Add bonuses and contextual effects
        this.addBonusesAndEffects(baseItem, itemData);

        // Add our module flags
        baseItem.flags = baseItem.flags || {};
        baseItem.flags[this.moduleId] = {
            generated: true,
            version: "1.0.0",
            originalData: itemData
        };
    }

    /**
     * Add special weapon abilities to the weapon's attack actions
     * @param {Object} baseItem - Base weapon item
     * @param {string} mechanicalEffects - Description of mechanical effects
     */
    addSpecialWeaponAbilities(baseItem, mechanicalEffects) {
        if (!baseItem.system.actions || baseItem.system.actions.length === 0) {
            return; // No attack action to modify
        }

        const attackAction = baseItem.system.actions[0];
        if (!attackAction.damage || !attackAction.damage.parts) {
            return; // No damage structure to modify
        }

        // Define special abilities and their damage effects
        const specialAbilities = {
            'flaming': { formula: '1d6', type: 'fire' },
            'frost': { formula: '1d6', type: 'cold' },
            'shock': { formula: '1d6', type: 'electricity' },
            'corrosive': { formula: '1d6', type: 'acid' },
            'thundering': { formula: '1d8', type: 'sonic' },
            'holy': { formula: '2d6', type: 'positive' },
            'unholy': { formula: '2d6', type: 'negative' },
            'anarchic': { formula: '2d6', type: 'chaotic' },
            'axiomatic': { formula: '2d6', type: 'lawful' },
            'vicious': { formula: '2d6', type: 'untyped' },
            'wounding': { formula: '1', type: 'bleed' },
        };

        // Define burst abilities and their critical damage effects
        const burstAbilities = {
            'flaming burst': { normalFormula: '1d6', critFormula: '1d10', type: 'fire' },
            'icy burst': { normalFormula: '1d6', critFormula: '1d10', type: 'cold' },
            'shocking burst': { normalFormula: '1d6', critFormula: '1d10', type: 'electricity' },
            'corrosive burst': { normalFormula: '1d6', critFormula: '1d10', type: 'acid' },
            'thundering burst': { normalFormula: '1d8', critFormula: '1d10', type: 'sonic' },
        };

        const effects = mechanicalEffects.toLowerCase();
        let damageAdded = false;

        // Initialize critParts if it doesn't exist
        if (!attackAction.damage.critParts) {
            attackAction.damage.critParts = [];
        }

        // Check for burst abilities first (more specific)
        for (const [abilityName, abilityData] of Object.entries(burstAbilities)) {
            if (effects.includes(abilityName)) {
                // Add normal damage
                attackAction.damage.parts.push({
                    formula: abilityData.normalFormula,
                    types: [abilityData.type]
                });
                // Add critical damage
                attackAction.damage.critParts.push({
                    formula: abilityData.critFormula,
                    types: [abilityData.type]
                });
                damageAdded = true;
                console.log(`Spacebone | Added ${abilityName} ability: ${abilityData.normalFormula} ${abilityData.type} damage + ${abilityData.critFormula} on crit`);
            }
        }

        // Check for regular special abilities (only if no burst version was found)
        for (const [abilityName, abilityData] of Object.entries(specialAbilities)) {
            if (effects.includes(abilityName) && !effects.includes(abilityName + ' burst')) {
                // Add this damage type to the attack
                attackAction.damage.parts.push({
                    formula: abilityData.formula,
                    types: [abilityData.type]
                });
                damageAdded = true;
                console.log(`Spacebone | Added ${abilityName} ability: ${abilityData.formula} ${abilityData.type} damage`);
            }
        }

        // Look for custom damage descriptions like "1d6 fire damage" or "additional 2d4 cold damage"
        const customDamageRegex = /(?:additional\s+)?(\d+d\d+|\d+)\s+(fire|cold|electricity|acid|sonic|force|positive|negative|lawful|chaotic|good|evil|slashing|piercing|bludgeoning|untyped)\s+damage/gi;
        let match;
        
        while ((match = customDamageRegex.exec(mechanicalEffects)) !== null) {
            const formula = match[1];
            const damageType = match[2].toLowerCase();
            
            // Avoid duplicating abilities we already added
            const alreadyHasType = attackAction.damage.parts.some(part => 
                part.types && part.types.includes(damageType)
            );
            
            if (!alreadyHasType) {
                attackAction.damage.parts.push({
                    formula: formula,
                    types: [damageType]
                });
                damageAdded = true;
                console.log(`Spacebone | Added custom damage: ${formula} ${damageType} damage`);
            }
        }

        // Look for critical-specific damage like "1d10 fire damage on critical hits"
        const critDamageRegex = /(?:additional\s+)?(\d+d\d+|\d+)\s+(fire|cold|electricity|acid|sonic|force|positive|negative|lawful|chaotic|good|evil|slashing|piercing|bludgeoning|untyped)\s+damage\s+(?:on\s+)?(?:critical\s+hits?|crits?)/gi;
        let critMatch;
        
        while ((critMatch = critDamageRegex.exec(mechanicalEffects)) !== null) {
            const formula = critMatch[1];
            const damageType = critMatch[2].toLowerCase();
            
            // Avoid duplicating critical damage we already added
            const alreadyHasCritType = attackAction.damage.critParts.some(part => 
                part.types && part.types.includes(damageType)
            );
            
            if (!alreadyHasCritType) {
                attackAction.damage.critParts.push({
                    formula: formula,
                    types: [damageType]
                });
                damageAdded = true;
                console.log(`Spacebone | Added custom critical damage: ${formula} ${damageType} damage on crit`);
            }
        }

        if (damageAdded) {
            console.log(`Spacebone | Enhanced weapon with special abilities. Total damage parts: ${attackAction.damage.parts.length}`);
        }
    }

    /**
     * Detect special material from item data
     * @param {Object} itemData - LLM generated item data
     * @returns {string|null} Material ID or null if none detected
     */
    detectMaterial(itemData) {
        // Check explicit material field first
        if (itemData.material && itemData.material.toLowerCase() !== 'standard') {
            const materialLower = itemData.material.toLowerCase();
            const materialKeywords = {
                'mithral': ['mithral', 'mithril'],
                'adamantine': ['adamantine'],
                'cold_iron': ['cold iron', 'coldiron'],
                'silver': ['silver', 'alchemical silver'],
                'darkwood': ['darkwood', 'dark wood'],
                'dragonhide': ['dragonhide', 'dragon hide', 'dragon scale'],
                'skymetal': ['skymetal', 'sky metal', 'numerian'],
                'sea_steel': ['sea-steel', 'sea steel', 'seasteel'],
                'living_steel': ['living steel', 'livingsteel'],
                'bone': ['bone', 'skeletal'],
                'obsidian': ['obsidian', 'volcanic glass']
            };

            for (const [materialId, keywords] of Object.entries(materialKeywords)) {
                if (keywords.some(keyword => materialLower.includes(keyword))) {
                    console.log(`Spacebone | Detected material from MATERIAL field: ${materialId}`);
                    return materialId;
                }
            }
        }

        // Combine all text sources for material detection
        const searchText = [
            itemData.name || '',
            itemData.description || '',
            itemData.mechanical?.effects || '',
            itemData.subType || ''
        ].join(' ').toLowerCase();

        // Check for each material keyword
        const materialKeywords = {
            'mithral': ['mithral', 'mithril'],
            'adamantine': ['adamantine', 'adamantine'],
            'cold_iron': ['cold iron', 'coldiron'],
            'silver': ['silver', 'silvered', 'alchemical silver'],
            'darkwood': ['darkwood', 'dark wood'],
            'dragonhide': ['dragonhide', 'dragon hide', 'dragon scale'],
            'skymetal': ['skymetal', 'sky metal', 'numerian'],
            'sea_steel': ['sea-steel', 'sea steel', 'seasteel'],
            'living_steel': ['living steel', 'livingsteel'],
            'bone': ['bone', 'skeletal'],
            'obsidian': ['obsidian', 'volcanic glass']
        };

        for (const [materialId, keywords] of Object.entries(materialKeywords)) {
            if (keywords.some(keyword => searchText.includes(keyword))) {
                console.log(`Spacebone | Detected material: ${materialId} from text containing: ${keywords.find(k => searchText.includes(k))}`);
                return materialId;
            }
        }

        return null;
    }

    /**
     * Add bonuses and contextual effects to items based on LLM data
     * @param {Object} itemData - The item to modify
     * @param {Object} llmData - LLM generated data
     */
    addBonusesAndEffects(itemData, llmData) {
        // Initialize arrays if they don't exist
        itemData.system.changes = itemData.system.changes || [];
        itemData.system.contextNotes = itemData.system.contextNotes || [];

        // Parse mechanical effects for bonuses
        if (llmData.mechanical?.effects) {
            this.parseBonusesFromText(itemData, llmData.mechanical.effects, llmData.name);
        }

        // Parse description for additional bonuses
        if (llmData.description) {
            this.parseBonusesFromText(itemData, llmData.description, llmData.name);
        }

        // Add spell-like abilities as actions
        if (llmData.spellLikeAbilities && llmData.spellLikeAbilities.length > 0) {
            this.addSpellActions(itemData, llmData);
        }
    }

    /**
     * Parse text for bonus patterns and add appropriate changes/contextNotes
     * @param {Object} itemData - Item to modify
     * @param {string} text - Text to parse
     * @param {string} itemName - Item name for context notes
     */
    parseBonusesFromText(itemData, text, itemName) {
        const textLower = text.toLowerCase();

        // Patterns for different types of bonuses
        const bonusPatterns = [
            // Ability scores: "+2 wisdom", "+4 to charisma"
            { 
                regex: /\+(\d+)\s+(?:to\s+)?(?:enhancement\s+)?(?:bonus\s+to\s+)?(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)/gi,
                handler: (match, bonus, ability) => this.addAbilityBonus(itemData, ability, parseInt(bonus))
            },
            
            // Saving throws: "+3 to all saves", "+2 fortitude save"
            {
                regex: /\+(\d+)\s+(?:to\s+)?(?:all\s+)?(?:saving\s+throws?|saves?|fortitude|reflex|will)/gi,
                handler: (match, bonus) => this.addSaveBonus(itemData, parseInt(bonus), match.toLowerCase())
            },

            // AC bonuses: "+4 armor bonus to AC", "+2 natural armor"
            {
                regex: /\+(\d+)\s+(?:armor\s+bonus\s+to\s+ac|natural\s+armor|ac|armor\s+class)/gi,
                handler: (match, bonus) => this.addACBonus(itemData, parseInt(bonus), 'armor')
            },

            // Touch AC: "+4 to touch AC"
            {
                regex: /\+(\d+)\s+(?:to\s+)?touch\s+ac/gi,
                handler: (match, bonus) => this.addTouchACBonus(itemData, parseInt(bonus))
            },

            // Skills: "+5 stealth", "+10 climb", "+3 to diplomacy"
            {
                regex: /\+(\d+)\s+(?:to\s+)?(?:bonus\s+(?:on|to)\s+)?(acrobatics|appraise|bluff|climb|craft|diplomacy|disable device|disguise|escape artist|fly|handle animal|heal|intimidate|knowledge|linguistics|perception|perform|profession|ride|sense motive|sleight of hand|spellcraft|stealth|survival|swim|use magic device)/gi,
                handler: (match, bonus, skill) => this.addSkillBonus(itemData, skill, parseInt(bonus), itemName)
            },

            // Conditional bonuses: "+5 stealth in forests", "+3 vs undead"
            {
                regex: /\+(\d+)\s+(?:to\s+)?(\w+)\s+(?:in|when|against|vs\.?)\s+([^.!?]+)/gi,
                handler: (match, bonus, skill, condition) => this.addContextualBonus(itemData, skill, parseInt(bonus), condition.trim(), itemName)
            },

            // Speed bonuses: "+20 climb speed", "swim speed 30"
            {
                regex: /(?:\+(\d+)\s+)?(?:(climb|swim|fly|burrow)\s+speed)\s+(?:of\s+)?(\d+)?/gi,
                handler: (match, bonus, speedType, baseSpeed) => this.addSpeedBonus(itemData, speedType, parseInt(bonus || baseSpeed || 0))
            }
        ];

        // Apply each pattern
        bonusPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                try {
                    pattern.handler(match, ...match.slice(1));
                } catch (error) {
                    console.warn(`Spacebone | Error parsing bonus "${match[0]}":`, error);
                }
            }
        });
    }

    /**
     * Add ability score bonus
     */
    addAbilityBonus(itemData, ability, bonus) {
        const abilityMap = {
            'strength': 'str', 'str': 'str',
            'dexterity': 'dex', 'dex': 'dex', 
            'constitution': 'con', 'con': 'con',
            'intelligence': 'int', 'int': 'int',
            'wisdom': 'wis', 'wis': 'wis',
            'charisma': 'cha', 'cha': 'cha'
        };

        const target = abilityMap[ability.toLowerCase()];
        if (target) {
            itemData.system.changes.push({
                _id: this.generateRandomId(),
                formula: bonus.toString(),
                target: target,
                type: 'enh',
                operator: 'add',
                priority: 0
            });
            console.log(`Spacebone | Added ${target} +${bonus} enhancement bonus`);
        }
    }

    /**
     * Add saving throw bonus
     */
    addSaveBonus(itemData, bonus, matchText) {
        let target = 'allSavingThrows';
        
        if (matchText.includes('fortitude')) target = 'fort';
        else if (matchText.includes('reflex')) target = 'ref';
        else if (matchText.includes('will')) target = 'will';

        itemData.system.changes.push({
            _id: this.generateRandomId(),
            formula: bonus.toString(),
            target: target,
            type: 'resist',
            operator: 'add',
            priority: 0
        });
        console.log(`Spacebone | Added ${target} +${bonus} resistance bonus`);
    }

    /**
     * Add AC bonus
     */
    addACBonus(itemData, bonus, bonusType) {
        itemData.system.changes.push({
            _id: this.generateRandomId(),
            formula: bonus.toString(),
            target: 'ac',
            type: bonusType === 'natural' ? 'natural' : 'armor',
            operator: 'add',
            priority: 0
        });
        console.log(`Spacebone | Added AC +${bonus} ${bonusType} bonus`);
    }

    /**
     * Add Touch AC bonus
     */
    addTouchACBonus(itemData, bonus) {
        itemData.system.changes.push({
            _id: this.generateRandomId(),
            formula: bonus.toString(),
            target: 'tac',
            type: 'sacred',
            operator: 'add',
            priority: 0
        });
        console.log(`Spacebone | Added Touch AC +${bonus} sacred bonus`);
    }

    /**
     * Add skill bonus
     */
    addSkillBonus(itemData, skill, bonus, itemName) {
        const skillMap = {
            'acrobatics': 'acr', 'appraise': 'apr', 'bluff': 'blu', 'climb': 'clm',
            'craft': 'crf', 'diplomacy': 'dip', 'disable device': 'dis', 'disguise': 'dis',
            'escape artist': 'esc', 'fly': 'fly', 'handle animal': 'han', 'heal': 'hea',
            'intimidate': 'int', 'knowledge': 'kno', 'linguistics': 'lin', 'perception': 'per',
            'perform': 'prf', 'profession': 'pro', 'ride': 'rid', 'sense motive': 'sen',
            'sleight of hand': 'slt', 'spellcraft': 'spl', 'stealth': 'ste', 'survival': 'sur',
            'swim': 'swm', 'use magic device': 'umd'
        };

        const target = skillMap[skill.toLowerCase()];
        if (target) {
            itemData.system.changes.push({
                _id: this.generateRandomId(),
                formula: bonus.toString(),
                target: `skill.${target}`,
                type: 'competence',
                operator: 'add',
                priority: 0
            });
            console.log(`Spacebone | Added ${skill} +${bonus} competence bonus`);
        }
    }

    /**
     * Add contextual bonus (shows as context note)
     */
    addContextualBonus(itemData, skill, bonus, condition, itemName) {
        const skillMap = {
            'stealth': 'skill.ste', 'diplomacy': 'skill.dip', 'intimidate': 'skill.int',
            'perception': 'skill.per', 'survival': 'skill.sur', 'climb': 'skill.clm',
            'swim': 'skill.swm', 'sleight of hand': 'skill.slt', 'bluff': 'skill.blu',
            'sense motive': 'skill.sen', 'acrobatics': 'skill.acr'
        };

        const target = skillMap[skill.toLowerCase()] || 'misc';
        
        itemData.system.contextNotes.push({
            text: `${itemName}: +${bonus} ${skill} ${condition}`,
            target: target
        });
        console.log(`Spacebone | Added contextual bonus: +${bonus} ${skill} ${condition}`);
    }

    /**
     * Add speed bonus
     */
    addSpeedBonus(itemData, speedType, speed) {
        const speedTarget = `${speedType}Speed`;
        
        itemData.system.changes.push({
            _id: this.generateRandomId(),
            formula: speed.toString(),
            target: speedTarget,
            type: 'enh',
            operator: 'add',
            priority: 0
        });
        console.log(`Spacebone | Added ${speedType} speed +${speed}`);
    }

    /**
     * Generate a random ID for changes
     */
    generateRandomId() {
        return Math.random().toString(36).substring(2, 10);
    }

    /**
     * Add spell-like abilities as actions
     * @param {Object} itemData - Item to modify
     * @param {Object} llmData - LLM generated data
     */
    addSpellActions(itemData, llmData) {
        // Initialize actions array if it doesn't exist
        itemData.system.actions = itemData.system.actions || [];

        // Process each spell-like ability
        llmData.spellLikeAbilities.forEach((spellAbility, index) => {
            if (!spellAbility.name || spellAbility.name.toLowerCase().includes('leave blank')) {
                return; // Skip empty entries
            }

            const spellAction = this.createSpellAction(spellAbility, llmData.casterLevel || 1);
            if (spellAction) {
                // For consumables, adjust the action based on type
                if (llmData.type === 'consumable') {
                    spellAction.name = this.getConsumableActionName(llmData.subType);
                    spellAction.ammo = { cost: 1 }; // Consume the item
                }
                
                itemData.system.actions.push(spellAction);
                console.log(`Spacebone | Added spell action: ${spellAbility.name} (${spellAbility.uses || '1/day'})`);
            }
        });

        // Add proper uses data for consumables
        if (llmData.type === 'consumable') {
            this.setupConsumableUses(itemData, llmData);
        } else if (itemData.system.actions.length > 0) {
            // Update item uses for non-consumables
            this.updateItemUses(itemData, llmData.spellLikeAbilities);
        }
    }

    /**
     * Create a spell action from spell ability data
     * @param {Object} spellAbility - Spell ability data
     * @param {number} casterLevel - Item's caster level
     * @returns {Object} Action object
     */
    createSpellAction(spellAbility, casterLevel) {
        const spellName = spellAbility.name;
        const spellData = this.getSpellData(spellName);
        
        // Parse uses (e.g., "3/day", "1/day", "at-will")
        const usesData = this.parseSpellUses(spellAbility.uses || '1/day');
        
        // Parse activation (e.g., "standard action", "command word")
        const activationData = this.parseActivation(spellAbility.activation || 'standard action');

        // Calculate save DC if spell allows save
        const saveDC = this.calculateSaveDC(spellData, casterLevel, spellAbility);

        const action = {
            _id: this.generateRandomId(),
            name: "Use", // Use generic name like in sample
            actionType: spellData.actionType || 'other',
            activation: {
                type: activationData.type,
                cost: activationData.cost,
                unchained: {
                    cost: activationData.unchainedCost || 2, // Default unchained cost
                    type: activationData.unchainedType || "action"
                }
            },
            area: spellData.area || '',
            duration: spellData.duration || { units: 'inst' },
            range: spellData.range || { units: 'personal' },
            uses: {}, // Uses handled at item level, not action level
            ability: {
                critRange: 20,
                critMult: 2
            },
            powerAttack: {
                damageBonus: 2,
                critMultiplier: 1
            },
            ammo: { type: "none" }
        };

        // Add save information if the spell allows a save
        if (spellData.allowsSave) {
            action.save = {
                dc: saveDC > 0 ? saveDC.toString() : "", // Empty string if no DC calculated
                type: spellData.saveType || 'ref',
                description: spellData.saveDescription || 'see spell description',
                harmless: false
            };
        }

        // Add damage information for damage spells
        if (spellData.damage) {
            action.damage = this.createSpellDamage(spellData, casterLevel);
        }

        // Add measure template for area spells
        if (spellData.template) {
            action.measureTemplate = spellData.template;
        }

        return action;
    }

    /**
     * Get spell data for common spells
     * @param {string} spellName - Name of the spell
     * @returns {Object} Spell data
     */
    getSpellData(spellName) {
        const spellDatabase = {
            'fireball': {
                icon: "systems/pf1/icons/spells/fire-ball-fire-2.jpg",
                actionType: 'spellsave',
                allowsSave: true,
                saveType: 'ref',
                saveDescription: 'Reflex half',
                damage: { formula: '1d6', type: 'fire', perLevel: true, maxLevel: 10 },
                range: { units: "long" },
                area: "20-ft.-radius spread",
                duration: { units: 'inst' },
                template: { type: "circle", size: "20", color: null, texture: null }
            },
            'lightning bolt': {
                icon: "systems/pf1/icons/spells/lightning-bolt.jpg",
                actionType: 'spellsave',
                allowsSave: true,
                saveType: 'ref',
                saveDescription: 'Reflex half',
                damage: { formula: '1d6', type: 'electricity', perLevel: true, maxLevel: 10 },
                range: { value: "120", units: "ft" },
                area: "120-ft. line",
                duration: { units: 'inst' },
                template: { type: "ray", size: "120", color: "#1e90ff" }
            },
            'cure light wounds': {
                icon: "systems/pf1/icons/spells/cure-light-wounds.jpg",
                actionType: 'heal',
                allowsSave: false,
                damage: { formula: '1d8', type: 'healing', perLevel: true, maxLevel: 5, bonus: 1 },
                range: { value: "touch", units: "touch" },
                duration: { units: 'inst' }
            },
            'entangle': {
                icon: "systems/pf1/icons/spells/entangle.jpg",
                actionType: 'spellsave',
                allowsSave: true,
                saveType: 'ref',
                saveDescription: 'Reflex partial; see text',
                range: { value: "long", units: "long" },
                area: "plants in a 40-ft.-radius spread",
                duration: { value: "1 min./level", units: "spec", dismiss: true },
                template: { type: "circle", size: "40", color: "#228b22" }
            },
            'feather fall': {
                icon: "systems/pf1/icons/spells/feather-fall.jpg",
                actionType: 'other',
                allowsSave: false,
                range: { value: "close", units: "close" },
                duration: { value: "until landing or 1 round/level", units: "spec" }
            },
            'magic missile': {
                icon: "systems/pf1/icons/spells/magic-missile.jpg",
                actionType: 'damage',
                allowsSave: false,
                damage: { formula: '1d4', type: 'force', missiles: true, bonus: 1 },
                range: { value: "medium", units: "medium" },
                duration: { units: 'inst' }
            }
        };

        return spellDatabase[spellName.toLowerCase()] || {
            icon: "systems/pf1/icons/spells/generic.jpg",
            actionType: 'other',
            allowsSave: false,
            range: { units: 'personal' },
            duration: { units: 'inst' },
            template: { type: "circle", size: "5", color: null, texture: null }
        };
    }

    /**
     * Parse spell uses string (e.g., "3/day", "at-will")
     * @param {string} usesString - Uses string
     * @returns {Object} Uses data
     */
    parseSpellUses(usesString) {
        const usesLower = usesString.toLowerCase();
        
        if (usesLower.includes('at-will') || usesLower.includes('unlimited')) {
            return {};
        }

        const match = usesString.match(/(\d+)\/(\w+)/);
        if (match) {
            const count = parseInt(match[1]);
            const period = match[2];
            
            return {
                autoDeductChargesCost: "1",
                self: {
                    value: count,
                    maxFormula: count.toString(),
                    per: period
                }
            };
        }

        // Default to 1/day
        return {
            autoDeductChargesCost: "1", 
            self: {
                value: 1,
                maxFormula: "1",
                per: "day"
            }
        };
    }

    /**
     * Parse activation string
     * @param {string} activationString - Activation string
     * @returns {Object} Activation data
     */
    parseActivation(activationString) {
        const actLower = activationString.toLowerCase();
        
        if (actLower.includes('immediate')) {
            return { cost: 1, type: 'immediate' };
        } else if (actLower.includes('swift')) {
            return { cost: 1, type: 'swift' };
        } else if (actLower.includes('move')) {
            return { cost: 1, type: 'move' };
        } else if (actLower.includes('full')) {
            return { cost: 1, type: 'full' };
        } else if (actLower.includes('command')) {
            return { cost: 1, type: 'standard' };
        } else {
            return { cost: 1, type: 'standard' };
        }
    }

    /**
     * Calculate save DC for spell
     * @param {Object} spellData - Spell data
     * @param {number} casterLevel - Caster level
     * @param {Object} spellAbility - Spell ability data
     * @returns {number} Save DC
     */
    calculateSaveDC(spellData, casterLevel, spellAbility) {
        if (!spellData.allowsSave) return 0;

        // Check if DC is explicitly provided in description
        const dcMatch = spellAbility.description?.match(/DC\s+(\d+)/i);
        if (dcMatch) {
            return parseInt(dcMatch[1]);
        }

        // Estimate spell level based on caster level and damage
        let spellLevel = 1;
        if (spellData.damage?.perLevel) {
            spellLevel = Math.min(Math.floor(casterLevel / 2), 9);
        }

        // Basic DC calculation: 10 + spell level + ability modifier (assume 4 for magic items)
        return 10 + spellLevel + 4;
    }

    /**
     * Create damage data for spell
     * @param {Object} spellData - Spell data
     * @param {number} casterLevel - Caster level
     * @returns {Object} Damage data
     */
    createSpellDamage(spellData, casterLevel) {
        const damage = spellData.damage;
        let formula = damage.formula;
        
        if (damage.perLevel) {
            const level = Math.min(casterLevel, damage.maxLevel || 20);
            formula = `${level}${damage.formula}`;
        }
        
        if (damage.bonus) {
            formula += ` + ${damage.bonus}`;
        }

        if (damage.missiles) {
            // Magic missile special case
            const missiles = Math.min(Math.floor(casterLevel / 2) + 1, 5);
            formula = `${missiles}d4 + ${missiles}`;
        }

        return {
            parts: [{
                formula: formula,
                types: [damage.type]
            }]
        };
    }

    /**
     * Update item uses based on spell abilities
     * @param {Object} itemData - Item data
     * @param {Array} spellAbilities - Spell abilities
     */
    updateItemUses(itemData, spellAbilities) {
        // Find the most restrictive use pattern for item-level tracking
        let mostRestrictive = null;
        
        spellAbilities.forEach(ability => {
            if (!ability.uses || ability.uses.toLowerCase().includes('at-will')) return;
            
            const match = ability.uses.match(/(\d+)\/(\w+)/);
            if (match) {
                const count = parseInt(match[1]);
                const period = match[2];
                
                if (!mostRestrictive || count < mostRestrictive.count) {
                    mostRestrictive = { count, period };
                }
            }
        });

        if (mostRestrictive) {
            // Set item-level uses like in the user's example
            itemData.system.uses = {
                value: null, // Will be set to max on creation
                per: "",
                autoDeductChargesCost: "",
                maxFormula: "",
                rechargeFormula: ""
            };
        } else {
            // Ensure uses is properly initialized even without spell abilities
            itemData.system.uses = {
                value: null,
                per: "",
                autoDeductChargesCost: "",
                maxFormula: "",
                rechargeFormula: ""
            };
        }
    }

    /**
     * Build a custom item from scratch (fallback method)
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Custom item data
     */
    buildCustomItem(itemData) {
        const systemData = this.buildSystemData(itemData);
        
        // Set equipment slot for PF1 system
        if (itemData.type === 'equipment') {
            systemData.slot = this.getEquipmentSlot(itemData.subType, itemData.name);
        }
        
        // Handle masterwork and enhancement following pf1-magic-item-gen pattern
        const isRequestedMasterwork = itemData.name && itemData.name.toLowerCase().includes('masterwork');
        const hasEnhancement = itemData.enhancement && itemData.enhancement > 0;
        const hasMagicalEffects = itemData.mechanical?.effects && itemData.mechanical.effects.trim() !== '';
        
        // Set masterwork status
        if (isRequestedMasterwork || hasEnhancement || hasMagicalEffects) {
            systemData.masterwork = true;
        }
        
        // Add enhancement bonus for weapons/armor
        if (hasEnhancement) {
            if (itemData.type === 'weapon') {
                systemData.enh = itemData.enhancement;
                systemData.masterwork = true;
                if (!systemData.material.addon.includes('magic')) {
                    systemData.material.addon.push('magic');
                }
            } else if (itemData.type === 'armor') {
                // Use proper PF1 armor enhancement path
                systemData.armor = systemData.armor || {};
                systemData.armor.enh = itemData.enhancement;
                systemData.masterwork = true;
                systemData.armor.material = systemData.armor.material || { addon: [] };
                if (!systemData.armor.material.addon.includes('magic')) {
                    systemData.armor.material.addon.push('magic');
                }
            }
        }
        
        const customItem = {
            name: itemData.name,
            type: this.mapItemType(itemData.type),
            img: this.getDefaultIcon(itemData.type, itemData.subType, itemData.name),
            system: systemData,
            flags: {
                [this.moduleId]: {
                    generated: true,
                    version: "1.0.0",
                    originalData: itemData
                }
            }
        };

        // Detect and apply special materials
        const detectedMaterial = this.detectMaterial(itemData);
        if (detectedMaterial) {
            applyMaterialToItem(customItem, detectedMaterial);
            // Update price with material cost
            const materialCost = calculateMaterialCost(detectedMaterial, customItem);
            customItem.system.price = (customItem.system.price || 0) + materialCost;
        }

        // Add bonuses and contextual effects
        this.addBonusesAndEffects(customItem, itemData);

        return customItem;
    }

    /**
     * Map generic item type to PF1 item type
     * @param {string} type - Generic item type
     * @returns {string} PF1 item type
     */
    mapItemType(type) {
        const typeMap = {
            'equipment': 'equipment',
            'weapon': 'weapon',
            'armor': 'equipment',
            'consumable': 'consumable',
            'loot': 'loot'
        };

        return typeMap[type] || 'equipment';
    }

    /**
     * Get default icon for item type
     * @param {string} type - Item type
     * @param {string} subType - Item subtype
     * @returns {string} Icon path
     */
    getDefaultIcon(type, subType, itemName = '') {
        // Comprehensive PF1 system icon mapping using actual system icons
        const iconMap = {
            'weapon': {
                // Swords
                'longsword': 'systems/pf1/icons/items/weapons/longsword.png',
                'shortsword': 'systems/pf1/icons/items/weapons/sword-short.PNG',
                'greatsword': 'systems/pf1/icons/items/weapons/greatsword.PNG',
                'scimitar': 'systems/pf1/icons/items/weapons/scimitar.PNG',
                'rapier': 'systems/pf1/icons/items/weapons/rapier.PNG',
                'falchion': 'systems/pf1/icons/items/weapons/falchion.PNG',
                'katana': 'systems/pf1/icons/items/weapons/katana.png',
                'cutlass': 'systems/pf1/icons/items/weapons/cutlass.PNG',
                'bastard sword': 'systems/pf1/icons/items/weapons/sword-bastard.PNG',
                'two-bladed sword': 'systems/pf1/icons/items/weapons/sword-two-bladed.png',
                
                // Axes
                'greataxe': 'systems/pf1/icons/items/weapons/greataxe.png',
                'battleaxe': 'systems/pf1/icons/items/weapons/battleaxe.PNG',
                'handaxe': 'systems/pf1/icons/items/weapons/handaxe.png',
                'throwing axe': 'systems/pf1/icons/items/weapons/axe-throwing.png',
                'dwarven waraxe': 'systems/pf1/icons/items/weapons/waraxe-dwarven.PNG',
                
                // Hammers & Maces
                'warhammer': 'systems/pf1/icons/items/weapons/warhammer.png',
                'light hammer': 'systems/pf1/icons/items/weapons/hammer-light.PNG',
                'heavy mace': 'systems/pf1/icons/items/weapons/mace-heavy.PNG',
                'light mace': 'systems/pf1/icons/items/weapons/mace-light.png',
                'morningstar': 'systems/pf1/icons/items/weapons/morningstar.PNG',
                'club': 'systems/pf1/icons/items/weapons/club.PNG',
                'greatclub': 'systems/pf1/icons/items/weapons/greatclub.png',
                
                // Spears & Polearms
                'spear': 'systems/pf1/icons/items/weapons/spear.png',
                'longspear': 'systems/pf1/icons/items/weapons/longspear.PNG',
                'shortspear': 'systems/pf1/icons/items/weapons/shortspear.PNG',
                'javelin': 'systems/pf1/icons/items/weapons/javelin.PNG',
                'lance': 'systems/pf1/icons/items/weapons/lance.PNG',
                'trident': 'systems/pf1/icons/items/weapons/trident.PNG',
                'halberd': 'systems/pf1/icons/items/weapons/halberd.PNG',
                'glaive': 'systems/pf1/icons/items/weapons/glaive.png',
                
                // Bows & Ranged
                'longbow': 'systems/pf1/icons/items/weapons/longbow.PNG',
                'shortbow': 'systems/pf1/icons/items/weapons/shortbow.PNG',
                'heavy crossbow': 'systems/pf1/icons/items/weapons/crossbow-heavy.PNG',
                'light crossbow': 'systems/pf1/icons/items/weapons/crossbow-light.PNG',
                'hand crossbow': 'systems/pf1/icons/items/weapons/crossbow-hand.PNG',
                'sling': 'systems/pf1/icons/items/weapons/sling.png',
                
                // Daggers & Light Blades
                'dagger': 'systems/pf1/icons/items/weapons/dagger.PNG',
                'kukri': 'systems/pf1/icons/items/weapons/kukri.PNG',
                'punching dagger': 'systems/pf1/icons/items/weapons/dagger-punching.PNG',
                
                // Exotic & Special
                'whip': 'systems/pf1/icons/items/weapons/whip.png',
                'net': 'systems/pf1/icons/items/weapons/net.png',
                'quarterstaff': 'systems/pf1/icons/items/weapons/quarterstaff.png',
                'scythe': 'systems/pf1/icons/items/weapons/scythe.PNG',
                'sickle': 'systems/pf1/icons/items/weapons/sickle.png',
                'kama': 'systems/pf1/icons/items/weapons/kama.png',
                'nunchaku': 'systems/pf1/icons/items/weapons/nunchaku.png',
                'sai': 'systems/pf1/icons/items/weapons/sai.png',
                
                // Flails
                'heavy flail': 'systems/pf1/icons/items/weapons/flail-heavy.png',
                'light flail': 'systems/pf1/icons/items/weapons/flail-light.PNG',
                'dire flail': 'systems/pf1/icons/items/weapons/flail-dire.png',
                
                // Picks
                'heavy pick': 'systems/pf1/icons/items/weapons/pick-heavy.png',
                'light pick': 'systems/pf1/icons/items/weapons/pick-light.PNG',
                
                // Default weapon
                'default': 'systems/pf1/icons/items/weapons/longsword.png'
            },
            
            'armor': {
                // Light Armor
                'padded': 'systems/pf1/icons/items/armor/padded.png',
                'leather': 'systems/pf1/icons/items/armor/leather.PNG',
                'studded leather': 'systems/pf1/icons/items/armor/studded-leather.PNG',
                'chain shirt': 'systems/pf1/icons/items/armor/chain-shirt.png',
                
                // Medium Armor
                'hide': 'systems/pf1/icons/items/armor/hide-armor.PNG',
                'scale mail': 'systems/pf1/icons/items/armor/scale-mail.png',
                'chainmail': 'systems/pf1/icons/items/armor/chain-mail.png',
                'breastplate': 'systems/pf1/icons/items/armor/breastplate.PNG',
                
                // Heavy Armor
                'splint mail': 'systems/pf1/icons/items/armor/splint-mail.png',
                'banded mail': 'systems/pf1/icons/items/armor/banded-mail.PNG',
                'half plate': 'systems/pf1/icons/items/armor/half-plate.png',
                'full plate': 'systems/pf1/icons/items/armor/fullplate.PNG',
                
                // Shields
                'buckler': 'systems/pf1/icons/items/armor/buckler.PNG',
                'light shield': 'systems/pf1/icons/items/armor/shield-light-wood.png',
                'light metal shield': 'systems/pf1/icons/items/armor/shield-light-metal.png',
                'light wooden shield': 'systems/pf1/icons/items/armor/shield-light-wood.png',
                'heavy shield': 'systems/pf1/icons/items/armor/shield-heavy-wood.png',
                'heavy metal shield': 'systems/pf1/icons/items/armor/shield-heavy-metal.png',
                'heavy wooden shield': 'systems/pf1/icons/items/armor/shield-heavy-wood.png',
                'heavy steel shield': 'systems/pf1/icons/items/armor/shield-heavy-metal.png',
                'tower shield': 'systems/pf1/icons/items/armor/shield-tower.PNG',
                
                // Default armor
                'default': 'systems/pf1/icons/items/armor/leather.PNG'
            },
            
            'equipment': {
                // Wondrous Items
                'wondrous': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'wondrous item': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                
                // Jewelry & Worn Items
                'ring': 'systems/pf1/icons/items/jewelry/ring-gold.jpg',
                'amulet': 'systems/pf1/icons/items/jewelry/amulet-blue.jpg',
                'necklace': 'systems/pf1/icons/items/jewelry/necklace-teeth.jpg',
                'pendant': 'systems/pf1/icons/items/jewelry/pendant-blue.jpg',
                'circlet': 'systems/pf1/icons/items/jewelry/ring-silver.jpg',
                'crown': 'systems/pf1/icons/items/jewelry/ring-gold.jpg',
                'tiara': 'systems/pf1/icons/items/jewelry/ring-silver.jpg',
                'diadem': 'systems/pf1/icons/items/jewelry/ring-gold.jpg',
                
                // Head Slot Items
                'headband': 'systems/pf1/icons/items/jewelry/ring-silver.jpg',
                'hat': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                'cap': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                'helm': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                'hood': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'mask': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                
                // Magic Items
                'rod': 'systems/pf1/icons/items/inventory/rod-star.jpg',
                'staff': 'systems/pf1/icons/items/inventory/staff-simple.jpg',
                'wand': 'systems/pf1/icons/items/inventory/wand-carved.jpg',
                'orb': 'systems/pf1/icons/items/inventory/crystal-ball.jpg',
                'crystal': 'systems/pf1/icons/items/inventory/crystal-ball.jpg',
                'tome': 'systems/pf1/icons/items/inventory/book-red.jpg',
                'book': 'systems/pf1/icons/items/inventory/book-red.jpg',
                'manual': 'systems/pf1/icons/items/inventory/book-red.jpg',
                'scroll case': 'systems/pf1/icons/items/inventory/scroll-bound.jpg',
                
                // Clothing & Equipment
                'belt': 'systems/pf1/icons/items/equipment/belt-plain.jpg',
                'sash': 'systems/pf1/icons/items/equipment/belt-plain.jpg',
                'boots': 'systems/pf1/icons/items/equipment/boots-leather.jpg',
                'shoes': 'systems/pf1/icons/items/equipment/boots-leather.jpg',
                'slippers': 'systems/pf1/icons/items/equipment/boots-leather.jpg',
                'cloak': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'cape': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'mantle': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'robe': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'vest': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'gloves': 'systems/pf1/icons/items/equipment/gloves.jpg',
                'gauntlets': 'systems/pf1/icons/items/equipment/gloves.jpg',
                'bracers': 'systems/pf1/icons/items/equipment/bracers-leather.jpg',
                'armbands': 'systems/pf1/icons/items/equipment/bracers-leather.jpg',
                'helmet': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                
                // Tools & Instruments
                'lens': 'systems/pf1/icons/items/inventory/crystal-ball.jpg',
                'goggles': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                'glasses': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                'instrument': 'systems/pf1/icons/items/inventory/lute.jpg',
                'horn': 'systems/pf1/icons/items/inventory/horn.jpg',
                'flute': 'systems/pf1/icons/items/inventory/lute.jpg',
                'harp': 'systems/pf1/icons/items/inventory/lute.jpg',
                'drum': 'systems/pf1/icons/items/inventory/lute.jpg',
                
                // Containers
                'bag': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'pouch': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'sack': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'quiver': 'systems/pf1/icons/items/weapons/arrow.PNG',
                'case': 'systems/pf1/icons/items/inventory/scroll-bound.jpg',
                'chest': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'box': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                
                // Default equipment
                'default': 'systems/pf1/icons/items/inventory/bag-simple.jpg'
            },
            
            'consumable': {
                'potion': 'systems/pf1/icons/items/potions/minor-blue.jpg',
                'scroll': 'systems/pf1/icons/items/inventory/scroll-bound.jpg',
                'wand': 'systems/pf1/icons/items/inventory/wand-carved.jpg',
                'default': 'systems/pf1/icons/items/potions/minor-blue.jpg'
            },
            
            'loot': {
                'gem': 'systems/pf1/icons/items/inventory/gem-01.jpg',
                'art': 'systems/pf1/icons/items/inventory/ornament-gold.jpg',
                'trade': 'systems/pf1/icons/items/inventory/ingot-steel.jpg',
                'default': 'systems/pf1/icons/items/inventory/gem-01.jpg'
            }
        };

        // Normalize subType for lookup
        const normalizedSubType = subType ? subType.toLowerCase() : '';
        const normalizedName = itemName ? itemName.toLowerCase() : '';
        
        // Try specific subtype first
        if (iconMap[type] && iconMap[type][normalizedSubType]) {
            return iconMap[type][normalizedSubType];
        }
        
        // Smart name matching - look for keywords in item name
        if (iconMap[type] && normalizedName) {
            for (const [keyword, iconPath] of Object.entries(iconMap[type])) {
                if (keyword !== 'default' && normalizedName.includes(keyword)) {
                    console.log(`Spacebone | Smart icon match: "${normalizedName}" contains "${keyword}" -> ${iconPath}`);
                    return iconPath;
                }
            }
        }
        
        // Additional smart matching for common patterns
        if (normalizedName) {
            // Circlets, crowns, and head items
            if (normalizedName.includes('circlet') || normalizedName.includes('crown') || 
                normalizedName.includes('tiara') || normalizedName.includes('diadem')) {
                return 'systems/pf1/icons/items/jewelry/ring-silver.jpg';
            }
            
            // Cloaks and outer garments
            if (normalizedName.includes('cloak') || normalizedName.includes('cape') || 
                normalizedName.includes('mantle') || normalizedName.includes('robe')) {
                return 'systems/pf1/icons/items/equipment/cloak-plain.jpg';
            }
            
            // Boots and footwear
            if (normalizedName.includes('boots') || normalizedName.includes('shoes') || 
                normalizedName.includes('slippers')) {
                return 'systems/pf1/icons/items/equipment/boots-leather.jpg';
            }
            
            // Gloves and hand items
            if (normalizedName.includes('gloves') || normalizedName.includes('gauntlets') || 
                normalizedName.includes('bracers')) {
                return 'systems/pf1/icons/items/equipment/gloves.jpg';
            }
            
            // Belts and waist items
            if (normalizedName.includes('belt') || normalizedName.includes('sash') || 
                normalizedName.includes('girdle')) {
                return 'systems/pf1/icons/items/equipment/belt-plain.jpg';
            }
            
            // Magic items
            if (normalizedName.includes('rod') || normalizedName.includes('staff') || 
                normalizedName.includes('wand')) {
                return iconMap.equipment.rod || 'systems/pf1/icons/items/inventory/rod-star.jpg';
            }
            
            // Books and tomes
            if (normalizedName.includes('book') || normalizedName.includes('tome') || 
                normalizedName.includes('manual') || normalizedName.includes('grimoire')) {
                return 'systems/pf1/icons/items/inventory/book-red.jpg';
            }
            
            // Orbs and crystals
            if (normalizedName.includes('orb') || normalizedName.includes('crystal') || 
                normalizedName.includes('sphere')) {
                return 'systems/pf1/icons/items/inventory/crystal-ball.jpg';
            }
        }
        
        // Fall back to type default, then global default
        if (iconMap[type] && iconMap[type]['default']) {
            return iconMap[type]['default'];
        }
        
        // Final fallback
        return 'systems/pf1/icons/items/inventory/bag-simple.jpg';
    }

    /**
     * Get appropriate equipment slot for PF1 system
     * @param {string} subType - Item subtype
     * @param {string} itemName - Item name for smart matching
     * @returns {string} PF1 equipment slot
     */
    getEquipmentSlot(subType, itemName = '') {
        const normalizedSubType = subType ? subType.toLowerCase() : '';
        const normalizedName = itemName ? itemName.toLowerCase() : '';
        
        // Direct subtype mapping
        const slotMap = {
            // Head slot items
            'headband': 'head',
            'circlet': 'head',
            'crown': 'head',
            'tiara': 'head',
            'diadem': 'head',
            'hat': 'head',
            'cap': 'head',
            'helm': 'head',
            'helmet': 'head',
            'hood': 'head',
            'mask': 'head',
            
            // Neck slot items
            'amulet': 'neck',
            'necklace': 'neck',
            'pendant': 'neck',
            'collar': 'neck',
            'torque': 'neck',
            
            // Ring slot items
            'ring': 'ring',
            
            // Body slot items (armor/robes)
            'robe': 'body',
            'vest': 'body',
            'shirt': 'body',
            'tunic': 'body',
            
            // Shoulders slot items
            'cloak': 'shoulders',
            'cape': 'shoulders',
            'mantle': 'shoulders',
            
            // Chest slot items
            'brooch': 'chest',
            'medallion': 'chest',
            
            // Belt slot items
            'belt': 'belt',
            'sash': 'belt',
            'girdle': 'belt',
            
            // Feet slot items
            'boots': 'feet',
            'shoes': 'feet',
            'slippers': 'feet',
            'sandals': 'feet',
            
            // Hands slot items
            'gloves': 'hands',
            'gauntlets': 'hands',
            'mitts': 'hands',
            
            // Wrists slot items
            'bracers': 'wrists',
            'armbands': 'wrists',
            'cuffs': 'wrists',
            'vambraces': 'wrists',
            
            // Wondrous items (no slot)
            'wondrous': 'none',
            'wondrous item': 'none',
            'rod': 'none',
            'staff': 'none',
            'wand': 'none',
            'orb': 'none',
            'crystal': 'none',
            'tome': 'none',
            'book': 'none',
            'manual': 'none',
            'instrument': 'none',
            'lens': 'none',
            'goggles': 'eyes',
            'glasses': 'eyes'
        };
        
        // Try direct subtype mapping first
        if (slotMap[normalizedSubType]) {
            return slotMap[normalizedSubType];
        }
        
        // Smart name matching for slot assignment
        if (normalizedName) {
            // Head slot detection
            if (normalizedName.includes('circlet') || normalizedName.includes('crown') || 
                normalizedName.includes('tiara') || normalizedName.includes('diadem') ||
                normalizedName.includes('headband') || normalizedName.includes('helmet') ||
                normalizedName.includes('hat') || normalizedName.includes('cap') ||
                normalizedName.includes('hood') || normalizedName.includes('mask')) {
                return 'head';
            }
            
            // Neck slot detection
            if (normalizedName.includes('amulet') || normalizedName.includes('necklace') || 
                normalizedName.includes('pendant') || normalizedName.includes('collar') ||
                normalizedName.includes('torque')) {
                return 'neck';
            }
            
            // Ring slot detection
            if (normalizedName.includes('ring')) {
                return 'ring';
            }
            
            // Shoulders slot detection
            if (normalizedName.includes('cloak') || normalizedName.includes('cape') || 
                normalizedName.includes('mantle')) {
                return 'shoulders';
            }
            
            // Belt slot detection
            if (normalizedName.includes('belt') || normalizedName.includes('sash') || 
                normalizedName.includes('girdle')) {
                return 'belt';
            }
            
            // Feet slot detection
            if (normalizedName.includes('boots') || normalizedName.includes('shoes') || 
                normalizedName.includes('slippers') || normalizedName.includes('sandals')) {
                return 'feet';
            }
            
            // Hands slot detection
            if (normalizedName.includes('gloves') || normalizedName.includes('gauntlets') || 
                normalizedName.includes('mitts')) {
                return 'hands';
            }
            
            // Wrists slot detection
            if (normalizedName.includes('bracers') || normalizedName.includes('armbands') || 
                normalizedName.includes('cuffs') || normalizedName.includes('vambraces')) {
                return 'wrists';
            }
            
            // Body slot detection
            if (normalizedName.includes('robe') || normalizedName.includes('vest') || 
                normalizedName.includes('shirt') || normalizedName.includes('tunic')) {
                return 'body';
            }
            
            // Eyes slot detection
            if (normalizedName.includes('goggles') || normalizedName.includes('glasses') || 
                normalizedName.includes('monocle') || normalizedName.includes('eyepatch')) {
                return 'eyes';
            }
            
            // Slotless items
            if (normalizedName.includes('rod') || normalizedName.includes('staff') || 
                normalizedName.includes('wand') || normalizedName.includes('orb') ||
                normalizedName.includes('crystal') || normalizedName.includes('tome') ||
                normalizedName.includes('book') || normalizedName.includes('manual') ||
                normalizedName.includes('instrument') || normalizedName.includes('horn') ||
                normalizedName.includes('lens')) {
                return 'none';
            }
        }
        
        // Default to no slot for unknown equipment
        return 'none';
    }

    /**
     * Build PF1 system data from item data based on pf1-magic-item-gen structure
     * @param {Object} itemData - Raw item data
     * @returns {Object} PF1 system data
     */
    buildSystemData(itemData) {
        const systemData = {
            description: {
                value: this.formatDescription(itemData),
                chat: "",
                unidentified: ""
            },
            price: itemData.price || 0,
            weight: {
                value: itemData.weight || 0
            },
            identified: true,
            masterwork: itemData.masterwork || false,
            quantity: 1,
            hp: {
                max: 10,
                value: 10
            },
            hardness: 10,
            material: {
                normal: {
                    value: "",
                    custom: false
                },
                addon: []
            },
            unidentified: {
                name: itemData.name,
                price: itemData.price || 0
            }
        };

        // Add equipment-specific data
        if (itemData.type === 'equipment' || itemData.type === 'armor') {
            systemData.subType = itemData.subType || 'wondrous';
            systemData.slot = itemData.slot || 'none';
            systemData.equipped = false;
            systemData.armor = this.buildArmorData(itemData);
            
            if (itemData.enhancement) {
                systemData.armor.enh = itemData.enhancement;
            }
        }

        // Add weapon-specific data
        if (itemData.type === 'weapon') {
            const weaponData = this.buildWeaponData(itemData);
            Object.assign(systemData, weaponData);
            
            // Add weapon actions
            systemData.actions = this.buildWeaponActions(itemData);
        }

        // Add consumable-specific data
        if (itemData.type === 'consumable') {
            systemData.consumableType = itemData.subType || 'potion';
            systemData.uses = this.buildUsesData(itemData);
        }

        // Add activation data
        if (itemData.activation) {
            systemData.activation = this.buildActivationData(itemData.activation);
        }

        // Add changes (mechanical effects)
        if (itemData.changes && itemData.changes.length > 0) {
            systemData.changes = this.buildChangesData(itemData.changes);
        }

        // Add context notes
        if (itemData.contextNotes && itemData.contextNotes.length > 0) {
            systemData.contextNotes = this.buildContextNotes(itemData.contextNotes);
        }

        // Add magic item data
        if (itemData.casterLevel) {
            systemData.cl = itemData.casterLevel;
            systemData.aura = {
                school: this.extractAuraSchool(itemData.aura),
                strength: this.extractAuraStrength(itemData.aura),
                custom: false
            };
            
            // Mark as magical
            systemData.material.addon.push('magic');
        }

        // Add creation requirements and costs
        if (itemData.requirements) {
            systemData.requirements = itemData.requirements;
        }

        if (itemData.creationCost) {
            systemData.creationCost = itemData.creationCost;
        }

        // Add size data
        systemData.size = itemData.size || 'med';

        return systemData;
    }

    /**
     * Format item description with proper HTML
     * @param {Object} itemData - Item data
     * @returns {string} Formatted description
     */
    formatDescription(itemData) {
        let description = `<p>${itemData.description}</p>`;

        // Add aura information
        if (itemData.aura) {
            description += `<p><strong>Aura:</strong> ${itemData.aura}</p>`;
        }

        // Add caster level
        if (itemData.casterLevel) {
            description += `<p><strong>Caster Level:</strong> ${itemData.casterLevel}</p>`;
        }

        // Add requirements
        if (itemData.requirements) {
            description += `<p><strong>Requirements:</strong> ${itemData.requirements}</p>`;
        }

        // Add creation cost
        if (itemData.creationCost) {
            description += `<p><strong>Creation Cost:</strong> ${itemData.creationCost} gp</p>`;
        }

        return description;
    }

    /**
     * Build armor data for equipment
     * @param {Object} itemData - Item data
     * @returns {Object} Armor data
     */
    buildArmorData(itemData) {
        return {
            value: 0,
            dex: null,
            check: 0,
            spell: 0,
            type: itemData.type === 'armor' ? (itemData.subType || 'light') : 'misc'
        };
    }

    /**
     * Build weapon-specific system data
     * @param {Object} itemData - Raw item data
     * @returns {Object} Weapon system data
     */
    buildWeaponData(itemData) {
        const weaponInfo = this.getWeaponInfo(itemData.subType);
        
        return {
            weaponSubtype: weaponInfo.category || 'melee',
            proficient: true,
            held: weaponInfo.hands === 2 ? '2h' : (weaponInfo.hands === 1.5 ? '1h' : '1h'),
            hands: weaponInfo.hands || 1,
            subType: weaponInfo.proficiency || 'martial',
            baseTypes: [weaponInfo.baseType || itemData.subType],
            weaponGroups: weaponInfo.groups || [],
            enh: itemData.enhancement || 0,
            material: {
                base: { value: "steel", custom: false },
                normal: { value: "", custom: false },
                addon: itemData.enhancement > 0 ? ["magic"] : []
            }
        };
    }

    /**
     * Build weapon actions (attack mechanics)
     * @param {Object} itemData - Raw item data
     * @returns {Array} Weapon actions array
     */
    buildWeaponActions(itemData) {
        const weaponInfo = this.getWeaponInfo(itemData.subType);
        
        return [{
            _id: this.generateActionId(),
            ability: {
                attack: "_default",
                critMult: weaponInfo.critMult || 2,
                damage: "str"
            },
            actionType: "mwak",
            activation: {
                type: "attack",
                unchained: { type: "attack" }
            },
            damage: {
                parts: [{
                    formula: `sizeRoll(${weaponInfo.damage.dice}, ${weaponInfo.damage.sides}, @size)`,
                    types: [weaponInfo.damageType || "slashing"]
                }]
            },
            duration: { units: "inst" },
            extraAttacks: { type: "standard" },
            name: "Attack",
            range: {
                units: weaponInfo.range || "melee",
                value: weaponInfo.rangeValue || "0"
            }
        }];
    }

    /**
     * Get weapon mechanical information
     * @param {string} weaponType - Weapon type/subtype
     * @returns {Object} Weapon mechanics data
     */
    getWeaponInfo(weaponType) {
        const weaponData = {
            // Two-Handed Weapons
            'greataxe': {
                damage: { dice: 1, sides: 12 },
                critMult: 3,
                damageType: 'slashing',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greataxe',
                groups: ['axes']
            },
            'greatsword': {
                damage: { dice: 2, sides: 6 },
                critMult: 2,
                damageType: 'slashing',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greatsword',
                groups: ['heavy blades']
            },
            'greatclub': {
                damage: { dice: 1, sides: 10 },
                critMult: 2,
                damageType: 'bludgeoning',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greatclub',
                groups: ['clubs']
            },
            
            // One-Handed Weapons
            'longsword': {
                damage: { dice: 1, sides: 8 },
                critMult: 2,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Longsword',
                groups: ['heavy blades']
            },
            'battleaxe': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Battleaxe',
                groups: ['axes']
            },
            'scimitar': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Scimitar',
                groups: ['heavy blades']
            },
            'rapier': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Rapier',
                groups: ['light blades']
            },
            'warhammer': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'bludgeoning',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Warhammer',
                groups: ['hammers']
            },
            
            // Light Weapons
            'dagger': {
                damage: { dice: 1, sides: 4 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'light',
                proficiency: 'simple',
                baseType: 'Dagger',
                groups: ['light blades']
            },
            'shortsword': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'light',
                proficiency: 'martial',
                baseType: 'Short sword',
                groups: ['light blades']
            },
            
            // Ranged Weapons
            'longbow': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'piercing',
                hands: 2,
                category: 'ranged',
                proficiency: 'martial',
                baseType: 'Longbow',
                groups: ['bows'],
                range: 'ft',
                rangeValue: '100'
            },
            'shortbow': {
                damage: { dice: 1, sides: 6 },
                critMult: 3,
                damageType: 'piercing',
                hands: 2,
                category: 'ranged',
                proficiency: 'martial',
                baseType: 'Shortbow',
                groups: ['bows'],
                range: 'ft',
                rangeValue: '60'
            }
        };

        // Normalize the weapon type for lookup
        const normalizedType = weaponType.toLowerCase();
        
        // Return specific weapon data or default to longsword-like stats
        return weaponData[normalizedType] || {
            damage: { dice: 1, sides: 8 },
            critMult: 2,
            damageType: 'slashing',
            hands: 1,
            category: 'melee',
            proficiency: 'martial',
            baseType: weaponType,
            groups: []
        };
    }

    /**
     * Generate a unique action ID
     * @returns {string} Random action ID
     */
    generateActionId() {
        return Math.random().toString(36).substring(2, 18);
    }

    /**
     * Build activation data
     * @param {Object} activation - Activation data
     * @returns {Object} PF1 activation data
     */
    buildActivationData(activation) {
        return {
            cost: activation.cost || 1,
            type: activation.type || 'standard',
            condition: activation.condition || ''
        };
    }

    /**
     * Build uses data for consumables
     * @param {Object} itemData - Item data
     * @returns {Object} Uses data
     */
    buildUsesData(itemData) {
        if (!itemData.uses) {
            return {
                value: 0,
                max: 0,
                per: null,
                autoDeductCharges: false
            };
        }

        return {
            value: itemData.uses.max || 0,
            max: itemData.uses.max || 0,
            per: itemData.uses.per || null,
            autoDeductCharges: itemData.uses.autoDeductCharges || false
        };
    }

    /**
     * Build changes data for mechanical effects
     * @param {Array} changes - Changes array
     * @returns {Array} PF1 changes data
     */
    buildChangesData(changes) {
        return changes.map(change => ({
            formula: change.formula || "0",
            target: change.target || "misc",
            subTarget: change.subTarget || "",
            modifier: change.modifier || "untyped",
            priority: change.priority || 0,
            value: 0,
            continuous: true
        }));
    }

    /**
     * Build context notes
     * @param {Array} notes - Context notes array
     * @returns {Array} PF1 context notes
     */
    buildContextNotes(notes) {
        return notes.map(note => ({
            text: note.text || "",
            target: note.target || "misc"
        }));
    }

    /**
     * Extract aura school from aura string
     * @param {string} aura - Aura string
     * @returns {string} School name
     */
    extractAuraSchool(aura) {
        if (!aura) return '';
        
        const schoolMap = {
            'abjuration': 'abj',
            'conjuration': 'con',
            'divination': 'div',
            'enchantment': 'enc',
            'evocation': 'evo',
            'illusion': 'ill',
            'necromancy': 'nec',
            'transmutation': 'trs'
        };
        
        const lowerAura = aura.toLowerCase();
        for (const [fullName, abbreviation] of Object.entries(schoolMap)) {
            if (lowerAura.includes(fullName)) {
                return abbreviation;
            }
        }
        return '';
    }

    /**
     * Extract aura strength from aura string
     * @param {string} aura - Aura string
     * @returns {string} Strength level
     */
    extractAuraStrength(aura) {
        if (!aura) return '';
        
        const strengths = ['faint', 'moderate', 'strong', 'overwhelming'];
        const lowerAura = aura.toLowerCase();
        return strengths.find(strength => lowerAura.includes(strength)) || 'moderate';
    }

    /**
     * Validate item data before creation
     * @param {Object} itemData - Item data to validate
     * @throws {Error} If validation fails
     */
    validateItemData(itemData) {
        if (!itemData.name) {
            throw new Error('Item name is required');
        }

        if (!itemData.type) {
            throw new Error('Item type is required');
        }

        if (!itemData.system) {
            throw new Error('Item system data is required');
        }

        // Validate price
        if (itemData.system.price < 0) {
            throw new Error('Item price cannot be negative');
        }

        // Validate weight
        if (itemData.system.weight < 0) {
            throw new Error('Item weight cannot be negative');
        }
    }

    /**
     * Get the appropriate action name for consumables
     * @param {string} subType - Consumable subtype (potion, scroll, wand)
     * @returns {string} Action name
     */
    getConsumableActionName(subType) {
        switch (subType) {
            case 'potion':
                return 'Drink';
            case 'scroll':
                return 'Read';
            case 'wand':
                return 'Use';
            default:
                return 'Use';
        }
    }

    /**
     * Setup uses data for consumables
     * @param {Object} itemData - Item data
     * @param {Object} llmData - LLM data
     */
    setupConsumableUses(itemData, llmData) {
        if (!itemData.system.uses) {
            itemData.system.uses = {};
        }

        switch (llmData.subType) {
            case 'potion':
                itemData.system.uses = {
                    value: null,
                    per: 'single',
                    autoDeductChargesCost: '',
                    maxFormula: '',
                    rechargeFormula: '',
                    pricePerUse: 0
                };
                break;
            case 'scroll':
                itemData.system.uses = {
                    value: null,
                    per: 'single',
                    autoDeductChargesCost: '',
                    maxFormula: '',
                    rechargeFormula: '',
                    pricePerUse: 0
                };
                break;
            case 'wand':
                itemData.system.uses = {
                    value: 50,
                    per: 'charges',
                    autoDeductChargesCost: '',
                    maxFormula: '50',
                    rechargeFormula: '',
                    pricePerUse: Math.floor((llmData.price || 0) / 50),
                    max: 50
                };
                break;
            default:
                itemData.system.uses = {
                    value: 1,
                    per: 'single',
                    autoDeductChargesCost: '',
                    maxFormula: '1',
                    rechargeFormula: '',
                    pricePerUse: 0
                };
        }

        // Set subtype for consumables
        itemData.system.subType = llmData.subType || 'potion';
    }
}
