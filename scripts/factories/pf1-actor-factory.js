/**
 * PF1 Actor Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper PF1 FoundryVTT actors
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class PF1ActorFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a PF1 actor from LLM-generated data
     * @param {Object} actorData - Raw actor data from LLM
     * @returns {Promise<Object>} PF1-formatted actor data
     */
    async createPF1Actor(actorData) {
        try {
            const actorType = this.determineActorType(actorData);
            const isNPC = actorType === 'npc';
            
            // Build base actor structure
            const baseActor = {
                name: actorData.name || 'Unnamed Character',
                type: actorType,
                img: actorData.image || 'icons/svg/mystery-man.svg',
                system: {},
                items: [],
                effects: [],
                flags: {},
                ownership: {
                    default: 0
                }
            };

            // NPCs have simplified structure
            if (isNPC) {
                return await this.buildNPCActor(baseActor, actorData);
            } else {
                return await this.buildPCActor(baseActor, actorData);
            }
        } catch (error) {
            console.error('Spacebone | Error creating PF1 actor:', error);
            throw error;
        }
    }

    /**
     * Build a PC (character) actor
     * @param {Object} baseActor - Base actor structure
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Object>} Complete PC actor data
     */
    async buildPCActor(baseActor, actorData) {
        const level = this.parseLevel(actorData.level || 1);
        
        // Build abilities
        baseActor.system.abilities = this.buildAbilities(actorData, false);
        
        // Build details
        baseActor.system.details = {
            height: actorData.height || '',
            weight: actorData.weight || '',
            gender: this.parseGender(actorData.gender || ''),
            deity: actorData.deity || '',
            age: actorData.age || '',
            alignment: this.parseAlignment(actorData.alignment || ''),
            biography: {
                value: this.buildBiography(actorData)
            },
            bonusFeatFormula: '',
            bonusSkillRankFormula: '',
            carryCapacity: {
                bonus: { user: 0 },
                multiplier: { base: 1, user: 0 }
            },
            notes: {
                value: ''
            },
            xp: {
                value: 0
            },
            mythicTier: 0,
            cr: {
                base: level
            }
        };

        // Build attributes (HP, AC, saves, etc.)
        baseActor.system.attributes = this.buildAttributes(actorData, false);
        
        // Build skills (PF1 uses skill ranks)
        baseActor.system.skills = this.buildSkills(actorData, false);
        
        // Build traits (size, senses, etc.)
        baseActor.system.traits = this.buildTraits(actorData);
        
        // Build spells structure
        baseActor.system.attributes.spells = this.buildSpellStructure(actorData);
        
        // Add race/class items from compendiums
        const characterItems = await this.getCharacterCreationItems(actorData);
        baseActor.items = [...characterItems];
        
        // Add appropriate equipment based on level and class
        const equipmentItems = await this.getAppropriateEquipment(actorData);
        baseActor.items = [...baseActor.items, ...equipmentItems];
        
        // Validate the created actor data
        this.validateActorData(baseActor);
        
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.log('Spacebone | Created PF1 actor data:', baseActor);
        }

        return baseActor;
    }

    /**
     * Build an NPC actor with simplified structure
     * @param {Object} baseActor - Base actor structure
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Object>} Complete NPC actor data
     */
    async buildNPCActor(baseActor, actorData) {
        const level = this.parseLevel(actorData.level || 1);
        
        // NPCs use simplified details
        baseActor.system.details = {
            height: actorData.height || '',
            weight: actorData.weight || '',
            gender: this.parseGender(actorData.gender || ''),
            deity: actorData.deity || '',
            age: actorData.age || '',
            alignment: this.parseAlignment(actorData.alignment || ''),
            biography: {
                value: this.buildNPCBiography(actorData)
            },
            notes: {
                value: ''
            },
            cr: {
                base: level
            }
        };

        // NPCs use ability modifiers directly
        baseActor.system.abilities = this.buildAbilities(actorData, true);
        
        // NPCs have simplified attributes
        baseActor.system.attributes = this.buildAttributes(actorData, true);
        
        // NPCs use simplified skills
        baseActor.system.skills = this.buildSkills(actorData, true);
        
        // Build traits
        baseActor.system.traits = this.buildTraits(actorData);
        
        // Add equipment for NPCs
        const equipmentItems = await this.getAppropriateEquipment(actorData);
        baseActor.items = [...equipmentItems];
        
        this.validateActorData(baseActor);
        
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.log('Spacebone | Created PF1 NPC actor data:', baseActor);
        }

        return baseActor;
    }

    /**
     * Determine actor type from data
     * @param {Object} actorData - LLM generated actor data
     * @returns {string} Actor type
     */
    determineActorType(actorData) {
        const type = (actorData.type || '').toLowerCase();
        if (type.includes('npc') || type.includes('creature') || type.includes('monster')) {
            return 'npc';
        }
        return 'character'; // Default to PC
    }

    /**
     * Parse level from string or number
     * @param {string|number} level - Actor level
     * @returns {number} Actor level
     */
    parseLevel(level) {
        if (typeof level === 'number') return Math.max(1, Math.min(20, level));
        const match = String(level).match(/(\d+)/);
        return match ? Math.max(1, Math.min(20, parseInt(match[1]))) : 1;
    }

    /**
     * Parse gender string
     * @param {string} gender - Gender string (e.g., "M/He/Him" or "F/She/Her")
     * @returns {string} Gender code (M/F/Other)
     */
    parseGender(gender) {
        if (!gender) return '';
        const upper = gender.toUpperCase();
        if (upper.startsWith('M') || upper.includes('HE/HIM')) return 'M';
        if (upper.startsWith('F') || upper.includes('SHE/HER')) return 'F';
        return gender.split('/')[0].trim(); // Take first part
    }

    /**
     * Parse alignment string to PF1 alignment code
     * @param {string} alignment - Alignment string
     * @returns {string} Alignment code (lg, ln, le, ng, n, ne, cg, cn, ce)
     */
    parseAlignment(alignment) {
        if (!alignment) return 'n';
        const lower = alignment.toLowerCase();
        if (lower.includes('lawful good') || lower.includes('lg')) return 'lg';
        if (lower.includes('lawful neutral') || lower.includes('ln')) return 'ln';
        if (lower.includes('lawful evil') || lower.includes('le')) return 'le';
        if (lower.includes('neutral good') || lower.includes('ng')) return 'ng';
        if (lower.includes('neutral') || lower.includes('true neutral')) return 'n';
        if (lower.includes('neutral evil') || lower.includes('ne')) return 'ne';
        if (lower.includes('chaotic good') || lower.includes('cg')) return 'cg';
        if (lower.includes('chaotic neutral') || lower.includes('cn')) return 'cn';
        if (lower.includes('chaotic evil') || lower.includes('ce')) return 'ce';
        return 'n';
    }

    /**
     * Build abilities object
     * @param {Object} actorData - Actor data
     * @param {boolean} isNPC - Whether this is an NPC
     * @returns {Object} Abilities object
     */
    buildAbilities(actorData, isNPC = false) {
        const abilities = actorData.abilities || {};
        
        let str = 10, dex = 10, con = 10, int = 10, wis = 10, cha = 10;
        
        if (abilities && typeof abilities === 'object') {
            str = parseInt(abilities.str) || 10;
            dex = parseInt(abilities.dex) || 10;
            con = parseInt(abilities.con) || 10;
            int = parseInt(abilities.int) || 10;
            wis = parseInt(abilities.wis) || 10;
            cha = parseInt(abilities.cha) || 10;
        } else if (typeof abilities === 'string') {
            const parsed = this.parseAbilities(abilities);
            str = parsed.str;
            dex = parsed.dex;
            con = parsed.con;
            int = parsed.int;
            wis = parsed.wis;
            cha = parsed.cha;
        }
        
        // PF1 uses ability scores with damage, drain, userPenalty
        return {
            str: { value: str, damage: 0, drain: 0, userPenalty: 0 },
            dex: { value: dex, damage: 0, drain: 0, userPenalty: 0 },
            con: { value: con, damage: 0, drain: 0, userPenalty: 0 },
            int: { value: int, damage: 0, drain: 0, userPenalty: 0 },
            wis: { value: wis, damage: 0, drain: 0, userPenalty: 0 },
            cha: { value: cha, damage: 0, drain: 0, userPenalty: 0 }
        };
    }

    /**
     * Parse abilities string into object
     * @param {string} abilitiesStr - Abilities string (e.g., "STR: 12, DEX: 18, CON: 14")
     * @returns {Object} Abilities object
     */
    parseAbilities(abilitiesStr) {
        const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        
        if (!abilitiesStr || typeof abilitiesStr !== 'string') {
            return abilities;
        }
        
        const matches = abilitiesStr.matchAll(/(STR|DEX|CON|INT|WIS|CHA):\s*(\d+)/gi);
        for (const match of matches) {
            const ability = match[1].toLowerCase();
            const value = parseInt(match[2]);
            if (ability in abilities && !isNaN(value)) {
                abilities[ability] = value;
            }
        }
        
        return abilities;
    }

    /**
     * Get ability modifier from score
     * @param {number} score - Ability score
     * @returns {number} Modifier
     */
    getAbilityModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    /**
     * Build attributes (HP, AC, saves, etc.)
     * @param {Object} actorData - Actor data
     * @param {boolean} isNPC - Whether this is an NPC
     * @returns {Object} Attributes object
     */
    buildAttributes(actorData, isNPC = false) {
        const level = this.parseLevel(actorData.level || 1);
        const abilities = actorData.abilities || {};
        const con = parseInt(abilities.con) || 10;
        const dex = parseInt(abilities.dex) || 10;
        const conMod = this.getAbilityModifier(con);
        
        // Calculate HP based on class
        const hp = this.calculateHP(actorData, level, conMod);
        
        const attributes = {
            hpAbility: 'con',
            cmbAbility: 'str',
            naturalAC: 0,
            ac: {
                normal: { ability: 'dex' },
                touch: { ability: 'dex' },
                flatFooted: {}
            },
            cmd: {
                strAbility: 'str',
                dexAbility: 'dex'
            },
            sr: {
                formula: ''
            },
            clCheck: false,
            saveNotes: '',
            acNotes: '',
            cmdNotes: '',
            srNotes: '',
            attack: {
                meleeAbility: 'str',
                rangedAbility: 'dex'
            },
            energyDrain: 1,
            quadruped: null,
            savingThrows: {
                fort: { base: 0, ability: 'con' },
                ref: { base: 0, ability: 'dex' },
                will: { base: 0, ability: 'wis' }
            },
            hp: {
                temp: 0,
                nonlethal: null,
                offset: 0
            },
            wounds: {
                offset: 0,
                base: 0,
                min: 0,
                max: 0
            },
            vigor: {
                temp: 0,
                offset: 0,
                base: 0,
                min: 0,
                max: 0
            },
            init: {
                value: 0,
                ability: 'dex'
            },
            speed: {
                land: { base: 30 },
                climb: { base: null },
                swim: { base: null },
                burrow: { base: null },
                fly: { base: null, maneuverability: 'average' }
            },
            spells: this.buildSpellStructure(actorData)
        };

        // Set HP only if not using max HP mode (if max HP mode, system will calculate automatically)
        if (!this.isMaxHpMode()) {
            attributes.wounds.max = hp;
            attributes.wounds.value = hp;
        } else {
            // In max HP mode, don't set HP - let the system calculate it automatically
            // Just set initial values that will be recalculated by the system
            attributes.wounds.max = 0;
            attributes.wounds.value = 0;
        }
        
        return attributes;
    }

    /**
     * Diagnostic helper to inspect PF1 system settings
     * This will log all available PF1 settings to help identify the correct key for HP configuration
     * @private
     */
    _diagnosePF1Settings() {
        console.group('Spacebone | PF1 System Settings Diagnosis');
        try {
            // Try to get all PF1 settings
            const settings = game.settings.settings;
            if (settings) {
                console.log('All registered settings:', settings);
                const pf1Settings = Array.from(settings.entries()).filter(([key]) => key.startsWith('pf1.'));
                console.log('PF1 settings found:', pf1Settings.map(([key]) => key));
            }

            // Try to access PF1 system directly
            if (game.system?.pf1) {
                console.log('PF1 system object:', game.system.pf1);
            }

            // Try CONFIG
            if (CONFIG?.PF1) {
                console.log('CONFIG.PF1:', CONFIG.PF1);
            }

            // Try to access settings storage
            try {
                const storage = game.settings.storage?.get('world');
                if (storage) {
                    const keys = Array.from(storage.keys()).filter(k => k.startsWith('pf1'));
                    console.log('PF1 settings in storage:', keys);
                    keys.forEach(key => {
                        try {
                            const value = storage.get(key);
                            console.log(`  ${key}:`, value);
                        } catch (e) {
                            console.log(`  ${key}: [could not read]`);
                        }
                    });
                }
            } catch (e) {
                console.log('Could not access settings storage:', e);
            }
        } catch (error) {
            console.error('Error during diagnosis:', error);
        }
        console.groupEnd();
    }

    /**
     * Check if PF1 system is using max HP mode
     * In max HP mode, the system automatically calculates max HP when class level is set,
     * so we should skip manually setting HP values.
     * 
     * NOTE: This is currently a placeholder. We need to verify the exact PF1 setting key
     * before implementing. Use _diagnosePF1Settings() to inspect available settings.
     * 
     * @returns {boolean} True if max HP mode is enabled
     */
    isMaxHpMode() {
        // TODO: Implement once we verify the exact PF1 setting key
        // For now, run diagnosis in debug mode to help identify the correct setting
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.warn('Spacebone | isMaxHpMode() not yet implemented - need to verify PF1 setting key');
            this._diagnosePF1Settings();
        }
        
        // Default to false (average HP mode) - safer to calculate HP manually
        // The system will recalculate if needed when the actor is saved
        return false;
    }

    /**
     * Calculate HP based on level, class, and Con modifier
     * Uses average HP per level (not max HP, which the system handles automatically)
     * @param {Object} actorData - Actor data
     * @param {number} level - Actor level
     * @param {number} conMod - Constitution modifier
     * @returns {number} HP value
     */
    calculateHP(actorData, level, conMod) {
        const className = (actorData.class || '').toLowerCase();
        
        // Base HP per class (at level 1)
        const baseHP = {
            'fighter': 10,
            'barbarian': 12,
            'paladin': 10,
            'ranger': 10,
            'monk': 8,
            'rogue': 8,
            'bard': 8,
            'cleric': 8,
            'druid': 8,
            'sorcerer': 6,
            'wizard': 6,
            'alchemist': 8,
            'cavalier': 10,
            'gunslinger': 10,
            'magus': 8,
            'oracle': 8,
            'summoner': 8,
            'witch': 6,
            'inquisitor': 8,
            'investigator': 8
        };
        
        // Find matching class
        let hpPerLevel = 8; // Default
        for (const [key, value] of Object.entries(baseHP)) {
            if (className.includes(key)) {
                hpPerLevel = value;
                break;
            }
        }
        
        // Calculate: base HP + (level - 1) * average + (level * conMod)
        const avgHP = Math.ceil(hpPerLevel / 2) + 0.5; // Average of hit die (e.g., d8 = 4.5)
        return hpPerLevel + ((level - 1) * avgHP) + (level * conMod);
    }

    /**
     * Build spell structure for PF1
     * @param {Object} actorData - Actor data
     * @returns {Object} Spell structure
     */
    buildSpellStructure(actorData) {
        return {
            spellbooks: {
                primary: {
                    name: '',
                    inUse: true,
                    castPerDayAllOffsetFormula: '',
                    preparedAllOffsetFormula: '',
                    casterType: 'high',
                    class: '',
                    cl: { formula: '', autoSpellLevelCalculationFormula: '' },
                    concentrationFormula: '',
                    concentrationNotes: '',
                    clNotes: '',
                    ability: 'int',
                    autoSpellLevelCalculation: true,
                    autoSpellLevels: true,
                    psychic: false,
                    arcaneSpellFailure: true,
                    hasCantrips: true,
                    spellPreparationMode: 'spontaneous',
                    baseDCFormula: '10 + @sl + @ablMod',
                    spellPoints: {
                        useSystem: false,
                        value: 0,
                        maxFormula: '',
                        restoreFormula: ''
                    },
                    spells: this.initializeSpellLevels()
                },
                secondary: {
                    name: '',
                    inUse: false,
                    castPerDayAllOffsetFormula: '',
                    preparedAllOffsetFormula: '',
                    casterType: 'high',
                    class: '',
                    cl: { formula: '' },
                    concentrationFormula: '',
                    concentrationNotes: '',
                    clNotes: '',
                    ability: 'int',
                    autoSpellLevelCalculation: true,
                    autoSpellLevels: true,
                    psychic: false,
                    arcaneSpellFailure: true,
                    hasCantrips: true,
                    spellPreparationMode: 'spontaneous',
                    baseDCFormula: '10 + @sl + @ablMod',
                    spellPoints: {
                        useSystem: false,
                        value: 0,
                        maxFormula: '',
                        restoreFormula: ''
                    },
                    spells: this.initializeSpellLevels(),
                    spellSlotAbilityBonusFormula: '',
                    domainSlotValue: 0
                },
                tertiary: {
                    name: '',
                    inUse: false,
                    castPerDayAllOffsetFormula: '',
                    preparedAllOffsetFormula: '',
                    casterType: 'high',
                    class: '',
                    cl: { formula: '' },
                    concentrationFormula: '',
                    concentrationNotes: '',
                    clNotes: '',
                    ability: 'int',
                    autoSpellLevelCalculation: true,
                    autoSpellLevels: true,
                    psychic: false,
                    arcaneSpellFailure: true,
                    hasCantrips: true,
                    spellPreparationMode: 'spontaneous',
                    baseDCFormula: '10 + @sl + @ablMod',
                    spellPoints: {
                        useSystem: false,
                        value: 0,
                        maxFormula: '',
                        restoreFormula: ''
                    },
                    spells: this.initializeSpellLevels(),
                    spellSlotAbilityBonusFormula: '',
                    domainSlotValue: 1
                },
                spelllike: {
                    name: '',
                    inUse: false,
                    castPerDayAllOffsetFormula: '',
                    preparedAllOffsetFormula: '',
                    casterType: 'high',
                    class: '_hd',
                    cl: { formula: '' },
                    concentrationFormula: '',
                    concentrationNotes: '',
                    clNotes: '',
                    ability: 'cha',
                    autoSpellLevelCalculation: true,
                    autoSpellLevels: true,
                    psychic: false,
                    arcaneSpellFailure: true,
                    hasCantrips: true,
                    spellPreparationMode: 'spontaneous',
                    baseDCFormula: '10 + @sl + @ablMod',
                    spellPoints: {
                        useSystem: false,
                        value: 0,
                        maxFormula: '',
                        restoreFormula: ''
                    },
                    spells: this.initializeSpellLevels(),
                    spellSlotAbilityBonusFormula: '',
                    domainSlotValue: 1
                }
            }
        };
    }

    /**
     * Initialize spell levels array (0-9)
     * @returns {Object} Spell levels object
     */
    initializeSpellLevels() {
        const spells = {};
        for (let i = 0; i <= 9; i++) {
            spells[`spell${i}`] = {
                castPerDayOffsetFormula: '',
                preparedOffsetFormula: '',
                value: null
            };
        }
        return spells;
    }

    /**
     * Build skills object (PF1 uses skill ranks)
     * @param {Object} actorData - Actor data
     * @param {boolean} isNPC - Whether this is an NPC
     * @returns {Object} Skills object
     */
    buildSkills(actorData, isNPC = false) {
        // PF1 skill IDs
        const skillIds = {
            'acrobatics': 'acr',
            'appraise': 'apr',
            'bluff': 'blf',
            'climb': 'clm',
            'craft': 'crf',
            'diplomacy': 'dip',
            'disable device': 'dev',
            'disguise': 'dis',
            'escape artist': 'esc',
            'fly': 'fly',
            'handle animal': 'han',
            'heal': 'hea',
            'intimidate': 'int',
            'knowledge (arcana)': 'kar',
            'knowledge (dungeoneering)': 'kdu',
            'knowledge (engineering)': 'ken',
            'knowledge (geography)': 'kge',
            'knowledge (history)': 'khg',
            'knowledge (local)': 'klc',
            'knowledge (nature)': 'kna',
            'knowledge (nobility)': 'kno',
            'knowledge (planes)': 'kpl',
            'knowledge (religion)': 'kre',
            'linguistics': 'lin',
            'perception': 'per',
            'perform': 'prf',
            'profession': 'pro',
            'ride': 'rid',
            'sense motive': 'sen',
            'sleight of hand': 'slt',
            'spellcraft': 'spl',
            'stealth': 'ste',
            'survival': 'sur',
            'swim': 'swm',
            'use magic device': 'umd'
        };

        // Initialize all skills to 0 ranks
        const skills = {};
        for (const [name, id] of Object.entries(skillIds)) {
            skills[id] = {
                ability: this.getSkillAbility(id),
                rt: false, // Ranks trained
                acp: this.hasArmorCheckPenalty(id), // Armor check penalty
                rank: 0
            };
        }

        // Set trained skills if specified
        if (actorData.trainedSkills) {
            const trained = Array.isArray(actorData.trainedSkills)
                ? actorData.trainedSkills
                : String(actorData.trainedSkills).split(',').map(s => s.trim().toLowerCase());

            const level = this.parseLevel(actorData.level || 1);

            trained.forEach(skillName => {
                // Try to find matching skill
                for (const [name, id] of Object.entries(skillIds)) {
                    if (name.toLowerCase().includes(skillName) || skillName.includes(name.toLowerCase())) {
                        if (skills[id]) {
                            skills[id].rank = level; // Set ranks equal to level
                            skills[id].rt = true; // Mark as trained
                        }
                        break;
                    }
                }
            });
        }

        return skills;
    }

    /**
     * Get ability for a skill
     * @param {string} skillId - Skill ID
     * @returns {string} Ability abbreviation
     */
    getSkillAbility(skillId) {
        const abilityMap = {
            'acr': 'dex', 'apr': 'int', 'blf': 'cha', 'clm': 'str', 'crf': 'int',
            'dip': 'cha', 'dev': 'dex', 'dis': 'cha', 'esc': 'dex', 'fly': 'dex',
            'han': 'cha', 'hea': 'wis', 'int': 'cha', 'kar': 'int', 'kdu': 'int',
            'ken': 'int', 'kge': 'int', 'khg': 'int', 'klc': 'int', 'kna': 'int',
            'kno': 'int', 'kpl': 'int', 'kre': 'int', 'lin': 'int', 'per': 'wis',
            'prf': 'cha', 'pro': 'wis', 'rid': 'dex', 'sen': 'wis', 'slt': 'dex',
            'spl': 'int', 'ste': 'dex', 'sur': 'wis', 'swm': 'str', 'umd': 'cha'
        };
        return abilityMap[skillId] || 'int';
    }

    /**
     * Check if skill has armor check penalty
     * @param {string} skillId - Skill ID
     * @returns {boolean} True if skill has ACP
     */
    hasArmorCheckPenalty(skillId) {
        const acpSkills = ['acr', 'clm', 'esc', 'fly', 'rid', 'ste', 'swm'];
        return acpSkills.includes(skillId);
    }

    /**
     * Build traits object
     * @param {Object} actorData - Actor data
     * @returns {Object} Traits object
     */
    buildTraits(actorData) {
        return {
            size: 'med',
            ageCategory: 'adult',
            senses: {
                dv: { value: 0 },
                ts: { value: 0 },
                bs: { value: 0 },
                bse: { value: 0 },
                ll: { enabled: false }
            }
        };
    }

    /**
     * Build biography HTML
     * @param {Object} actorData - Actor data
     * @returns {string} Biography HTML
     */
    buildBiography(actorData) {
        const parts = [];
        if (actorData.appearance) {
            parts.push(`<h3>Appearance</h3><p>${actorData.appearance}</p>`);
        }
        if (actorData.backstory) {
            parts.push(`<h3>Background</h3><p>${actorData.backstory}</p>`);
        }
        if (actorData.personality) {
            parts.push(`<h3>Personality</h3><p>${actorData.personality}</p>`);
        }
        return parts.join('\n') || '';
    }

    /**
     * Build NPC biography (simplified)
     * @param {Object} actorData - Actor data
     * @returns {string} Biography HTML
     */
    buildNPCBiography(actorData) {
        const parts = [];
        if (actorData.appearance) parts.push(actorData.appearance);
        if (actorData.backstory) parts.push(actorData.backstory);
        return parts.join(' ') || 'A simple NPC.';
    }

    /**
     * Get character creation items (race, class) from compendiums
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Array>} Array of character creation items
     */
    async getCharacterCreationItems(actorData) {
        const items = [];
        
        try {
            // Get race
            if (actorData.race) {
                const race = await this.getRaceFromCompendium(actorData.race);
                if (race) {
                    items.push(race);
                    console.log(`Spacebone | Added race: ${race.name}`);
                } else {
                    console.warn(`Spacebone | Could not find race: ${actorData.race}`);
                }
            }

            // Get class
            if (actorData.class) {
                const classItem = await this.getClassFromCompendium(actorData.class);
                if (classItem) {
                    // Set the level on the class item
                    const level = this.parseLevel(actorData.level || 1);
                    if (classItem.system) {
                        classItem.system.level = level;
                    } else {
                        classItem.system = { level: level };
                    }
                    console.log(`Spacebone | Added class: ${classItem.name} at level ${level}`);
                    items.push(classItem);
                } else {
                    console.warn(`Spacebone | Could not find class: ${actorData.class}`);
                }
            }
        } catch (error) {
            console.error('Spacebone | Error getting character creation items:', error);
        }
        
        return items;
    }

    /**
     * Get race from PF1 compendium
     * @param {string} raceName - Name of the race
     * @returns {Promise<Object|null>} Race item or null
     */
    async getRaceFromCompendium(raceName) {
        try {
            const packNames = ['pf1.races', 'pf1.races-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getIndex();
                const normalizedName = raceName.toLowerCase();
                
                let match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName ||
                           entryName.includes(normalizedName) ||
                           normalizedName.includes(entryName);
                });

                if (match) {
                    const race = await pack.getDocument(match._id);
                    if (race) {
                        return race.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting race ${raceName}:`, error);
        }
        return null;
    }

    /**
     * Get class from PF1 compendium
     * @param {string} className - Name of the class
     * @returns {Promise<Object|null>} Class item or null
     */
    async getClassFromCompendium(className) {
        try {
            const packNames = ['pf1.classes', 'pf1.classes-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getIndex();
                const normalizedName = className.toLowerCase();
                
                let match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName ||
                           entryName.includes(normalizedName) ||
                           normalizedName.includes(entryName);
                });

                if (match) {
                    const classItem = await pack.getDocument(match._id);
                    if (classItem) {
                        return classItem.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting class ${className}:`, error);
        }
        return null;
    }

    /**
     * Get appropriate equipment for the actor based on level and class
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Array>} Array of equipment items
     */
    async getAppropriateEquipment(actorData) {
        const items = [];
        const level = this.parseLevel(actorData.level || 1);
        const className = (actorData.class || '').toLowerCase();
        
        // Calculate number of items: approximately 1 per 3 levels (minimum 1)
        const numItems = Math.max(1, Math.floor(level / 3) + 1);
        
        console.log(`Spacebone | Getting equipment for level ${level} ${className} (target: ${numItems} items)`);
        
        try {
            // Always try to get a weapon (appropriate for class)
            const weapon = await this.getAppropriateWeapon(className, level);
            if (weapon) {
                items.push(weapon);
                console.log(`Spacebone | Added weapon: ${weapon.name}`);
            }

            // Get armor if martial class
            const isMartial = ['fighter', 'paladin', 'ranger', 'barbarian', 'monk', 'rogue', 'cavalier', 'gunslinger'].some(c => className.includes(c));
            if (isMartial && items.length < numItems) {
                const armor = await this.getAppropriateArmor(className, level);
                if (armor) {
                    items.push(armor);
                    console.log(`Spacebone | Added armor: ${armor.name}`);
                }
            }

            // Get a potion or consumable
            if (items.length < numItems) {
                const consumable = await this.getAppropriateConsumable(level);
                if (consumable) {
                    items.push(consumable);
                    console.log(`Spacebone | Added consumable: ${consumable.name}`);
                }
            }
        } catch (error) {
            console.error('Spacebone | Error getting equipment:', error);
        }
        
        return items;
    }

    /**
     * Get appropriate weapon from compendium
     * @param {string} className - Class name
     * @param {number} level - Actor level
     * @returns {Promise<Object|null>} Weapon item or null
     */
    async getAppropriateWeapon(className, level) {
        try {
            const pack = game.packs.get('pf1.weapons-and-ammo');
            if (!pack) return null;

            const index = await pack.getIndex();
            
            // Choose weapon type based on class
            const weaponTypes = [];
            if (className.includes('fighter') || className.includes('paladin') || className.includes('ranger')) {
                weaponTypes.push('longsword', 'greatsword', 'longbow', 'composite longbow');
            } else if (className.includes('rogue') || className.includes('bard')) {
                weaponTypes.push('rapier', 'shortsword', 'dagger', 'shortbow');
            } else if (className.includes('barbarian')) {
                weaponTypes.push('greataxe', 'greatsword', 'falchion');
            } else if (className.includes('monk')) {
                weaponTypes.push('unarmed strike', 'monk', 'nunchaku');
            } else if (className.includes('gunslinger')) {
                weaponTypes.push('pistol', 'musket', 'firearm');
            } else {
                weaponTypes.push('quarterstaff', 'dagger', 'crossbow');
            }
            
            // Try to find matching weapon
            for (const weaponType of weaponTypes) {
                const match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName.includes(weaponType.toLowerCase());
                });
                
                if (match) {
                    const weapon = await pack.getDocument(match._id);
                    if (weapon) {
                        return weapon.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting weapon:', error);
        }
        return null;
    }

    /**
     * Get appropriate armor from compendium
     * @param {string} className - Class name
     * @param {number} level - Actor level
     * @returns {Promise<Object|null>} Armor item or null
     */
    async getAppropriateArmor(className, level) {
        try {
            const pack = game.packs.get('pf1.armors-and-shields');
            if (!pack) return null;

            const index = await pack.getIndex();
            
            // Choose armor type based on class
            const armorTypes = [];
            if (className.includes('fighter') || className.includes('paladin')) {
                armorTypes.push('full plate', 'half plate', 'breastplate');
            } else if (className.includes('ranger') || className.includes('rogue')) {
                armorTypes.push('studded leather', 'leather', 'chain shirt');
            } else if (className.includes('barbarian')) {
                armorTypes.push('hide', 'studded leather', 'breastplate');
            } else {
                armorTypes.push('leather', 'studded leather');
            }
            
            // Try to find matching armor
            for (const armorType of armorTypes) {
                const match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName.includes(armorType.toLowerCase());
                });
                
                if (match) {
                    const armor = await pack.getDocument(match._id);
                    if (armor) {
                        return armor.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting armor:', error);
        }
        return null;
    }

    /**
     * Get appropriate consumable from compendium
     * @param {number} level - Actor level
     * @returns {Promise<Object|null>} Consumable item or null
     */
    async getAppropriateConsumable(level) {
        try {
            const pack = game.packs.get('pf1.consumables');
            if (!pack) return null;

            const index = await pack.getIndex();
            
            // Try common consumables
            const consumableTypes = ['potion of cure light wounds', 'potion of cure moderate wounds', 'potion'];
            
            for (const consumableType of consumableTypes) {
                const match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName.includes(consumableType.toLowerCase());
                });
                
                if (match) {
                    const consumable = await pack.getDocument(match._id);
                    if (consumable) {
                        return consumable.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting consumable:', error);
        }
        return null;
    }

    /**
     * Validate actor data structure
     * @param {Object} actorData - Actor data to validate
     */
    validateActorData(actorData) {
        if (!actorData.name) {
            actorData.name = 'Unnamed Character';
        }
        if (!actorData.type) {
            actorData.type = 'character';
        }
        if (!actorData.system) {
            actorData.system = {};
        }
        if (!actorData.items) {
            actorData.items = [];
        }
    }
}

