/**
 * UI Components for Spacebone Item Creator
 * Provides the user interface for item creation
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class SpaceboneUI {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
        this.isDialogOpen = false;
        this.weaponsByType = {};
        this.armorsByType = {};
    }

    /**
     * Add the actor creator button to the actors sidebar
     * @param {Application} app - The ActorDirectory application
     * @param {jQuery} html - The rendered HTML
     */
    addActorCreatorButton(app, html) {
        // Only show for GMs
        if (!game.user.isGM) return;

        // Show in both PF1 and PF2e
        const systemId = game.system?.id;
        if (systemId !== 'pf1' && systemId !== 'pf2e') return;

        // Handle both v13+ (raw DOM) and legacy (jQuery) - match item directory pattern
        if (game.release.generation >= 13) {
            // For v13+, html is a raw DOM element
            const footer = html.querySelector('.directory-footer');
            if (!footer) {
                console.warn('Spacebone | Could not find .directory-footer in ActorDirectory');
                return;
            }

            // Check if button already exists
            if (footer.querySelector('#spaceboneActorButton')) return;
            
            const section = document.createElement('section');
            footer.append(section);
            section.classList.add('spacebone-generator', 'button-div');
            
            const spaceboneButton = document.createElement('button');
            spaceboneButton.type = 'button';
            spaceboneButton.classList.add('create-entity', 'spaceboneButton');
            spaceboneButton.id = 'spaceboneActorButton';
            section.append(spaceboneButton);
            spaceboneButton.addEventListener('click', () => this.openActorCreatorDialog());
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-skull'); // Skull icon for Spacebone!
            spaceboneButton.appendChild(icon);
            const innerText = document.createTextNode('Spacebone');
            spaceboneButton.appendChild(innerText);
        }
        else {
            // For legacy versions, html is a jQuery object
            if (html.find('#spaceboneActorButton').length > 0) return;
            
            const spaceboneButton = $("<button id='spaceboneActorButton' class='create-entity spaceboneButton'><i class='fas fa-skull'></i>Spacebone</button>");
            html.find(".directory-footer").append(spaceboneButton);
            spaceboneButton.click(() => this.openActorCreatorDialog());
        }
    }

    /**
     * Open the actor creator dialog
     */
    async openActorCreatorDialog() {
        if (this.isDialogOpen) return;

        // Check if API is configured
        if (!this.isAPIConfigured()) {
            ui.notifications.warn('Please configure your LLM API settings in module settings first.');
            return;
        }

        this.isDialogOpen = true;

        const dialog = new Dialog({
            title: 'Spacebone AI Actor Creator',
            content: await this.getActorDialogHTML(),
            buttons: {
                create: {
                    icon: '<i class="fas fa-user"></i>',
                    label: 'Create Actor',
                    callback: (html) => this.handleActorCreation(html)
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                    callback: () => this.isDialogOpen = false
                }
            },
            default: 'create',
            close: () => this.isDialogOpen = false,
            render: (html) => this.enhanceActorDialog(html)
        }, {
            width: 720,
            height: 580,
            resizable: true,
            classes: ['spacebone-dialog']
        });

        dialog.render(true);
    }

    /**
     * Get the actor dialog HTML content
     * @returns {Promise<string>} Dialog HTML
     */
    async getActorDialogHTML() {
        return `
            <div class="spacebone-creator">
                <!-- Header with Icon -->
                <div class="spacebone-header">
                    <i class="fas fa-skull spacebone-main-icon"></i>
                    <h2>Spacebone AI Actor Creator</h2>
                </div>
                
                <!-- AI Prompt Section -->
                <div class="prompt-section glass-panel">
                    <h3><i class="fas fa-magic"></i> AI Actor Prompt</h3>
                    <div class="form-group">
                        <label for="actor-prompt">Describe the character you want to create:</label>
                        <textarea id="actor-prompt" name="actor-prompt" rows="3" placeholder="e.g., 'a level 5 rogue from Caliphas' or 'a level 3 cleric of Sarenrae named Kyra from Katapesh'"></textarea>
                        <div class="example-text">
                            <small><em>Example:</em> "a level 5 rogue from Caliphas" or "a level 3 cleric of Sarenrae named Kyra"</small>
                        </div>
                    </div>
                </div>

                <div class="spacebone-status">
                    <div id="creation-status" class="status-hidden">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Creating actor...</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Enhance the actor dialog after rendering
     * @param {jQuery} html - The dialog HTML
     */
    enhanceActorDialog(html) {
        // Auto-resize textarea
        const textarea = html.find('#actor-prompt');
        textarea.on('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Focus on the textarea
        textarea.focus();

        // Handle Enter key (Ctrl+Enter to submit)
        textarea.on('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                html.closest('.dialog').find('[data-button="create"]').click();
            }
        });
    }

    /**
     * Handle actor creation from dialog
     * @param {jQuery} html - The dialog HTML
     */
    async handleActorCreation(html) {
        const prompt = html.find('#actor-prompt').val().trim();
        
        if (!prompt) {
            ui.notifications.warn('Please enter a description for the character you want to create.');
            return;
        }

        // Show status
        const statusEl = html.find('#creation-status');
        statusEl.removeClass('status-hidden').addClass('status-visible');
        
        // Disable the create button
        html.closest('.dialog').find('[data-button="create"]').prop('disabled', true);

        try {
            // Create the actor
            const actor = await globalThis.Spacebone.createActor(prompt);
            
            this.isDialogOpen = false;
            
            if (actor) {
                // Show success notification
                const message = `Successfully created actor: <strong>${actor.name}</strong>`;
                ui.notifications.info(message);
            }

        } catch (error) {
            console.error('Spacebone | Error in actor creation:', error);
            ui.notifications.error('Failed to create actor. Check the console for details.');
            
            // Re-enable the create button
            html.closest('.dialog').find('[data-button="create"]').prop('disabled', false);
            statusEl.removeClass('status-visible').addClass('status-hidden');
            
            // Don't close dialog on error
            this.isDialogOpen = false;
            return false;
        }
    }

    /**
     * Add the item creator button to the items sidebar
     * @param {Application} app - The ItemDirectory application
     * @param {jQuery} html - The rendered HTML
     */
    addItemCreatorButton(app, html) {
        // Only show for GMs (like pf1-magic-item-gen)
        if (!game.user.isGM) return;

        // Check if button already exists
        if (html.find('#spaceboneButton').length > 0) return;

        // Copy pf1-magic-item-gen code exactly
        if (game.release.generation >= 13) {
            const footer = html[0].querySelector('.directory-footer');
            const section = document.createElement('section');
            footer.append(section);
            section.classList.add('spacebone-generator', 'button-div');
            
            const spaceboneButton = document.createElement('button');
            spaceboneButton.type = 'button';
            spaceboneButton.classList.add('create-entity', 'spaceboneButton');
            spaceboneButton.id = 'spaceboneButton';
            section.append(spaceboneButton);
            spaceboneButton.addEventListener('click', () => this.openItemCreatorDialog());
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-skull'); // Skull icon for Spacebone!
            spaceboneButton.appendChild(icon);
            const innerText = document.createTextNode('Spacebone');
            spaceboneButton.appendChild(innerText);
        }
        else {
            const spaceboneButton = $("<button id='spaceboneButton' class='create-entity spaceboneButton'><i class='fas fa-skull'></i>Spacebone</button>");
            html.find(".directory-footer").append(spaceboneButton);
            spaceboneButton.click(() => this.openItemCreatorDialog());
        }
    }

    /**
     * Open the item creator dialog
     */
    async openItemCreatorDialog() {
        if (this.isDialogOpen) return;

        // Check if API is configured
        if (!this.isAPIConfigured()) {
            ui.notifications.warn('Please configure your LLM API settings in module settings first.');
            return;
        }

        this.isDialogOpen = true;

        // Pre-load item data if not already loaded
        if (!this.allWeapons || !this.allArmor) {
            ui.notifications.info('Loading item data from compendiums...');
            await this.loadItemData();
        }

        const dialog = new Dialog({
            title: 'Spacebone AI Item Creator',
            content: await this.getDialogHTML(),
            buttons: {
                create: {
                    icon: '<i class="fas fa-magic"></i>',
                    label: 'Create Item',
                    callback: (html) => this.handleItemCreation(html)
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                    callback: () => this.isDialogOpen = false
                }
            },
            default: 'create',
            close: () => this.isDialogOpen = false,
            render: (html) => this.enhanceDialog(html)
        }, {
            width: 720,
            height: 580,
            resizable: true,
            classes: ['spacebone-dialog']
        });

        dialog.render(true);
    }

    /**
     * Get the dialog HTML content
     * @returns {Promise<string>} Dialog HTML
     */
    async getDialogHTML() {
        return `
            <div class="spacebone-creator">
                <!-- Header with Icon -->
                <div class="spacebone-header">
                    <i class="fas fa-skull spacebone-main-icon"></i>
                    <h2>Spacebone AI Item Creator</h2>
                </div>
                
                <!-- AI Prompt Section -->
                <div class="prompt-section glass-panel">
                    <h3><i class="fas fa-magic"></i> AI Item Prompt</h3>
                    <div class="form-group">
                        <label for="item-prompt">Describe the item you want to create:</label>
                        <textarea id="item-prompt" name="item-prompt" rows="3" placeholder="Describe the magical item you want to create..."></textarea>
                        <div class="example-text">
                            <small><em>Example:</em> "a level 5 magic longsword from Cheliax" or "a ring of protection +2"</small>
                        </div>
                    </div>
                </div>

                <!-- Item Configuration Section -->
                <div class="config-section glass-panel">
                    <h3><i class="fas fa-cog"></i> Item Configuration</h3>
                    
                    <div class="form-group">
                        <label for="item-prompt">AI will auto-detect most settings, but you can override them below:</label>
                    </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="item-level">Item Level:</label>
                        <select id="item-level" name="item-level">
                            <option value="">Auto (from prompt)</option>
                            ${this.generateLevelOptions()}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="item-category">Item Category:</label>
                        <select id="item-category" name="item-category">
                            <option value="">Auto (from prompt)</option>
                            <option value="weapon">Weapon</option>
                            <option value="armor">Armor/Shield</option>
                            <option value="equipment">Equipment</option>
                            <option value="consumable">Consumable</option>
                            <option value="loot">Treasure/Loot</option>
                        </select>
                    </div>
                </div>

                <div class="form-row weapon-specific" style="display: none;">
                    <div class="form-group">
                        <label for="weapon-type">Weapon Type:</label>
                        <select id="weapon-type" name="weapon-type">
                            <option value="">Any Weapon</option>
                            <option value="axe">Axes</option>
                            <option value="blade-heavy">Heavy Blades</option>
                            <option value="blade-light">Light Blades</option>
                            <option value="bow">Bows</option>
                            <option value="close">Close Weapons</option>
                            <option value="crossbow">Crossbows</option>
                            <option value="double">Double Weapons</option>
                            <option value="flails">Flails</option>
                            <option value="hammer">Hammers</option>
                            <option value="monk">Monk Weapons</option>
                            <option value="natural">Natural Weapons</option>
                            <option value="polearm">Polearms</option>
                            <option value="spear">Spears</option>
                            <option value="thrown">Thrown Weapons</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="weapon-subtype">Specific Weapon:</label>
                        <select id="weapon-subtype" name="weapon-subtype">
                            <option value="">Any from type</option>
                        </select>
                    </div>
                </div>

                <div class="form-row armor-specific" style="display: none;">
                    <div class="form-group">
                        <label for="armor-type">Armor Type:</label>
                        <select id="armor-type" name="armor-type">
                            <option value="">Any Armor</option>
                            <option value="light">Light Armor</option>
                            <option value="medium">Medium Armor</option>
                            <option value="heavy">Heavy Armor</option>
                            <option value="shield">Shields</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="armor-subtype">Specific Armor:</label>
                        <select id="armor-subtype" name="armor-subtype">
                            <option value="">Any from type</option>
                        </select>
                    </div>
                </div>

                <div class="form-row equipment-specific" style="display: none;">
                    <div class="form-group">
                        <label for="equipment-type">Equipment Type:</label>
                        <select id="equipment-type" name="equipment-type">
                            <option value="">Wondrous Item</option>
                            <option value="wondrous">Wondrous Item</option>
                            <option value="ring">Ring</option>
                            <option value="rod">Rod</option>
                            <option value="staff">Staff</option>
                            <option value="wand">Wand</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="equipment-slot">Equipment Slot:</label>
                        <select id="equipment-slot" name="equipment-slot">
                            <option value="">Auto</option>
                            <option value="none">Slotless</option>
                            <option value="head">Head</option>
                            <option value="headband">Headband</option>
                            <option value="eyes">Eyes</option>
                            <option value="neck">Neck</option>
                            <option value="shoulders">Shoulders</option>
                            <option value="chest">Chest</option>
                            <option value="body">Body</option>
                            <option value="belt">Belt</option>
                            <option value="wrists">Wrists</option>
                            <option value="hands">Hands</option>
                            <option value="ring">Ring</option>
                            <option value="feet">Feet</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="flavor-region">Flavor/Region (optional):</label>
                    <select id="flavor-region" name="flavor-region">
                        <option value="">Generic/Universal</option>
                        <option value="alkenstar">Alkenstar (Firearms & Technology)</option>
                        <option value="cheliax">Cheliax (Infernal & Noble)</option>
                        <option value="varisia">Varisia (Frontier & Ancient)</option>
                        <option value="osirion">Osirion (Desert & Pharaonic)</option>
                        <option value="ustalav">Ustalav (Gothic Horror)</option>
                        <option value="tian-xia">Tian Xia (Oriental)</option>
                        <option value="mwangi">Mwangi Expanse (Jungle & Tribal)</option>
                        <option value="numeria">Numeria (Technological Ruins)</option>
                        <option value="worldwound">Worldwound (Demonic Corruption)</option>
                        <option value="shackles">Shackles (Pirate)</option>
                        <option value="linnorm-kings">Linnorm Kingdoms (Viking)</option>
                        <option value="brevoy">Brevoy (Noble Houses)</option>
                        <option value="river-kingdoms">River Kingdoms (Bandit Lords)</option>
                        <option value="mendev">Mendev (Crusader)</option>
                        <option value="qadira">Qadira (Trade & Genies)</option>
                    </select>
                </div>


                <div class="spacebone-status">
                    <div id="creation-status" class="status-hidden">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Creating item...</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate level options for item levels 1-25
     * @returns {string} HTML option elements
     */
    generateLevelOptions() {
        let options = '';
        for (let i = 1; i <= 25; i++) {
            const enhancement = this.getLevelToEnhancement(i);
            const priceRange = this.getLevelToPriceRange(i);
            options += `<option value="${i}">Level ${i} (${enhancement}, ${priceRange})</option>`;
        }
        return options;
    }

    /**
     * Convert item level to expected enhancement bonus
     * @param {number} level - Item level
     * @returns {string} Enhancement description
     */
    getLevelToEnhancement(level) {
        if (level <= 2) return "Masterwork";
        if (level <= 4) return "+1";
        if (level <= 7) return "+1-2";
        if (level <= 10) return "+2-3";
        if (level <= 13) return "+3-4";
        if (level <= 16) return "+4-5";
        if (level <= 19) return "+5-6";
        if (level <= 22) return "+6-7";
        return "+7-8";
    }

    /**
     * Convert item level to expected price range
     * @param {number} level - Item level
     * @returns {string} Price range description
     */
    getLevelToPriceRange(level) {
        if (level <= 2) return "100-400 gp";
        if (level <= 4) return "400-2K gp";
        if (level <= 7) return "2K-8K gp";
        if (level <= 10) return "8K-18K gp";
        if (level <= 13) return "18K-32K gp";
        if (level <= 16) return "32K-72K gp";
        if (level <= 19) return "72K-128K gp";
        if (level <= 22) return "128K-200K gp";
        return "200K+ gp";
    }

    /**
     * Load weapon and armor data from compendiums (mirroring pf1-magic-item-gen approach)
     * @returns {Promise<void>}
     */
    async loadItemData() {
        try {
            // Load weapons from pf1.weapons-and-ammo compendium
            const weaponPack = game.packs.get("pf1.weapons-and-ammo");
            if (weaponPack) {
                let weaponIndex = await weaponPack.getDocuments();
                weaponIndex.sort((a,b) => {
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
                
                // Separate by weapon subtype
                this.allWeapons = weaponIndex.filter(o => o.type === "weapon");
                this.meleeWeapons = this.allWeapons.filter(o => o.system.weaponSubtype !== "ranged");
                this.rangedWeapons = this.allWeapons.filter(o => o.system.weaponSubtype === "ranged");
                this.ammunition = weaponIndex.filter(o => o.type === "loot");
                
                // Categorize weapons by detailed types
                this.weaponsByType = this.categorizeWeapons(this.allWeapons);
            }

            // Load armor from pf1.armors-and-shields compendium
            const armorPack = game.packs.get("pf1.armors-and-shields");
            if (armorPack) {
                let armorIndex = await armorPack.getDocuments();
                armorIndex.sort((a,b) => {
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
                
                // Separate by armor type
                this.allArmor = armorIndex.filter(o => o.type === "equipment");
                this.armor = this.allArmor.filter(o => o.system.subType === "armor");
                this.shields = this.allArmor.filter(o => o.system.subType === "shield");
                
                // Categorize armor by detailed types
                this.armorsByType = this.categorizeArmor(this.allArmor);
            }

            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log('Spacebone | Loaded item data:', {
                    weapons: this.allWeapons?.length || 0,
                    armor: this.allArmor?.length || 0
                });
            }
        } catch (error) {
            console.warn('Spacebone | Could not load compendium data:', error);
        }
    }

    /**
     * Categorize weapons by type using PF1 weapon groups and names
     * @param {Array} weapons - Array of weapon items
     * @returns {Object} Categorized weapons
     */
    categorizeWeapons(weapons) {
        const categories = {
            'all': weapons,
            'melee': [],
            'ranged': [],
            'axe': [],
            'blade-heavy': [],
            'blade-light': [],
            'bow': [],
            'close': [],
            'crossbow': [],
            'double': [],
            'flails': [],
            'hammer': [],
            'monk': [],
            'natural': [],
            'polearm': [],
            'spear': [],
            'thrown': [],
            'simple': [],
            'martial': [],
            'exotic': []
        };

        weapons.forEach(weapon => {
            const name = weapon.name.toLowerCase();
            const weaponSubtype = weapon.system.weaponSubtype;
            const proficiency = weapon.system.proficiency;
            
            // Basic categorization
            if (weaponSubtype === 'ranged') {
                categories['ranged'].push(weapon);
            } else {
                categories['melee'].push(weapon);
            }
            
            // Proficiency categorization
            if (proficiency === 'sim') categories['simple'].push(weapon);
            else if (proficiency === 'mar') categories['martial'].push(weapon);
            else if (proficiency === 'exo') categories['exotic'].push(weapon);
            
            // Detailed weapon type categorization
            if (name.includes('axe') || name.includes('hatchet')) {
                categories['axe'].push(weapon);
            } else if (name.includes('greatsword') || name.includes('bastard') || name.includes('falchion') || 
                       name.includes('scimitar') || name.includes('longsword') || name.includes('two-handed sword')) {
                categories['blade-heavy'].push(weapon);
            } else if (name.includes('dagger') || name.includes('rapier') || name.includes('short sword') || 
                       name.includes('shortsword') || name.includes('kukri') || name.includes('sickle')) {
                categories['blade-light'].push(weapon);
            } else if ((name.includes('bow') && !name.includes('cross')) || name.includes('longbow') || 
                       name.includes('shortbow')) {
                categories['bow'].push(weapon);
            } else if (name.includes('crossbow')) {
                categories['crossbow'].push(weapon);
            } else if (name.includes('flail') || name.includes('whip') || name.includes('chain')) {
                categories['flails'].push(weapon);
            } else if (name.includes('hammer') || name.includes('mace') || name.includes('club') || 
                       name.includes('morningstar') || name.includes('warhammer')) {
                categories['hammer'].push(weapon);
            } else if (name.includes('spear') || name.includes('javelin') || name.includes('trident') || 
                       name.includes('lance')) {
                categories['spear'].push(weapon);
            } else if (name.includes('glaive') || name.includes('halberd') || name.includes('bardiche') || 
                       name.includes('fauchard') || name.includes('guisarme')) {
                categories['polearm'].push(weapon);
            } else if (name.includes('dart') || name.includes('shuriken') || name.includes('throwing')) {
                categories['thrown'].push(weapon);
            } else if (name.includes('kama') || name.includes('nunchaku') || name.includes('sai') || 
                       name.includes('quarterstaff') || name.includes('monk')) {
                categories['monk'].push(weapon);
            } else if (name.includes('gauntlet') || name.includes('unarmed') || name.includes('bite') || 
                       name.includes('claw') || name.includes('natural')) {
                categories['natural'].push(weapon);
            } else if (weapon.system.weaponData?.twoHanded || name.includes('double')) {
                categories['double'].push(weapon);
            } else {
                // Close weapons or default categorization
                categories['close'].push(weapon);
            }
        });

        return categories;
    }

    /**
     * Categorize armor by type using PF1 armor categories
     * @param {Array} armors - Array of armor items
     * @returns {Object} Categorized armor
     */
    categorizeArmor(armors) {
        const categories = {
            'all': armors,
            'armor': [],
            'shield': [],
            'light': [],
            'medium': [],
            'heavy': []
        };

        armors.forEach(armor => {
            const subType = armor.system.subType;
            
            if (subType === 'shield') {
                categories['shield'].push(armor);
            } else if (subType === 'armor') {
                categories['armor'].push(armor);
                
                // Further categorize by armor type
                const armorType = armor.system.armor?.type;
                if (armorType && categories[armorType]) {
                    categories[armorType].push(armor);
                } else {
                    // Fallback: categorize by name if type isn't set
                    const name = armor.name.toLowerCase();
                    if (name.includes('padded') || name.includes('leather') || name.includes('studded') || 
                        name.includes('chain shirt') || name.includes('light')) {
                        categories['light'].push(armor);
                    } else if (name.includes('hide') || name.includes('scale mail') || name.includes('chainmail') || 
                               name.includes('breastplate') || name.includes('medium')) {
                        categories['medium'].push(armor);
                    } else if (name.includes('splint') || name.includes('banded') || name.includes('half plate') || 
                               name.includes('full plate') || name.includes('heavy')) {
                        categories['heavy'].push(armor);
                    }
                }
            }
        });

        return categories;
    }

    /**
     * Enhance the dialog after rendering
     * @param {jQuery} html - The dialog HTML
     */
    enhanceDialog(html) {
        // Load item data from compendiums
        this.loadItemData();

        // Since we removed the example buttons, we can focus on core functionality

        // Handle category selection changes
        html.find('#item-category').on('change', (event) => {
            const category = $(event.target).val();
            this.toggleCategorySpecificControls(html, category);
        });

        // Handle weapon type selection changes
        html.find('#weapon-type').on('change', (event) => {
            const weaponType = $(event.target).val();
            this.populateWeaponSubtypes(html, weaponType);
        });

        // Handle armor type selection changes
        html.find('#armor-type').on('change', (event) => {
            const armorType = $(event.target).val();
            this.populateArmorSubtypes(html, armorType);
        });

        // Auto-resize textarea
        const textarea = html.find('#item-prompt');
        textarea.on('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Focus on the textarea
        textarea.focus();

        // Handle Enter key (Ctrl+Enter to submit)
        textarea.on('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                html.closest('.dialog').find('[data-button="create"]').click();
            }
        });
    }

    /**
     * Toggle category-specific form controls
     * @param {jQuery} html - The dialog HTML
     * @param {string} category - Selected category
     */
    toggleCategorySpecificControls(html, category) {
        // Hide all category-specific controls
        html.find('.weapon-specific, .armor-specific, .equipment-specific').hide();
        
        // Show relevant controls
        if (category === 'weapon') {
            html.find('.weapon-specific').show();
        } else if (category === 'armor') {
            html.find('.armor-specific').show();
        } else if (category === 'equipment') {
            html.find('.equipment-specific').show();
        }
    }

    /**
     * Populate weapon subtype options based on weapon type selection
     * @param {jQuery} html - The dialog HTML
     * @param {string} weaponType - Selected weapon type
     */
    populateWeaponSubtypes(html, weaponType) {
        const select = html.find('#weapon-subtype');
        select.empty().append('<option value="">Any from type</option>');
        
        let weaponsToShow = [];
        
        if (weaponType && this.weaponsByType && this.weaponsByType[weaponType]) {
            weaponsToShow = this.weaponsByType[weaponType];
        } else if (weaponType === 'all' && this.allWeapons) {
            weaponsToShow = this.allWeapons;
        } else if (weaponType === 'melee' && this.meleeWeapons) {
            weaponsToShow = this.meleeWeapons;
        } else if (weaponType === 'ranged' && this.rangedWeapons) {
            weaponsToShow = this.rangedWeapons;
        }
        
        if (weaponsToShow.length > 0) {
            weaponsToShow.forEach(weapon => {
                select.append(`<option value="${weapon.name}" data-id="${weapon.id}">${weapon.name}</option>`);
            });
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Populated ${weaponsToShow.length} weapons for type: ${weaponType}`);
            }
        }
    }

    /**
     * Populate armor subtype options based on armor type selection
     * @param {jQuery} html - The dialog HTML
     * @param {string} armorType - Selected armor type
     */
    populateArmorSubtypes(html, armorType) {
        const select = html.find('#armor-subtype');
        select.empty().append('<option value="">Any from type</option>');
        
        let armorsToShow = [];
        
        if (armorType && this.armorsByType && this.armorsByType[armorType]) {
            armorsToShow = this.armorsByType[armorType];
        } else if (armorType === 'all' && this.allArmor) {
            armorsToShow = this.allArmor;
        } else if (armorType === 'armor' && this.armor) {
            armorsToShow = this.armor;
        } else if (armorType === 'shield' && this.shields) {
            armorsToShow = this.shields;
        }
        
        if (armorsToShow.length > 0) {
            armorsToShow.forEach(armor => {
                select.append(`<option value="${armor.name}" data-id="${armor.id}">${armor.name}</option>`);
            });
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Populated ${armorsToShow.length} armors for type: ${armorType}`);
            }
        }
    }

    /**
     * Handle item creation from dialog
     * @param {jQuery} html - The dialog HTML
     */
    async handleItemCreation(html) {
        const prompt = html.find('#item-prompt').val().trim();
        
        if (!prompt) {
            ui.notifications.warn('Please enter a description for the item you want to create.');
            return;
        }

        // Gather all form data
        const formData = {
            level: html.find('#item-level').val(),
            category: html.find('#item-category').val(),
            weaponType: html.find('#weapon-type').val(),
            weaponSubtype: html.find('#weapon-subtype').val(),
            armorType: html.find('#armor-type').val(),
            armorSubtype: html.find('#armor-subtype').val(),
            equipmentType: html.find('#equipment-type').val(),
            equipmentSlot: html.find('#equipment-slot').val(),
            flavorRegion: html.find('#flavor-region').val()
        };

        // Show status
        const statusEl = html.find('#creation-status');
        statusEl.removeClass('status-hidden').addClass('status-visible');
        
        // Disable the create button
        html.closest('.dialog').find('[data-button="create"]').prop('disabled', true);

        try {
            // Build enhanced prompt with all context
            const enhancedPrompt = this.buildEnhancedPrompt(prompt, formData);

            // Create the item
            const item = await globalThis.Spacebone.createItem(enhancedPrompt);
            
            this.isDialogOpen = false;
            
            if (item) {
                // Show success notification with item link
                const message = `Successfully created item: <strong>${item.name}</strong>`;
                ui.notifications.info(message);
                
                // Optionally open the item sheet
                if (game.settings.get(this.moduleId, 'debugMode')) {
                    item.sheet.render(true);
                }
            }

        } catch (error) {
            console.error('Spacebone | Error in item creation:', error);
            const userMsg = error.message.includes('template format')
                ? 'The AI returned an invalid format. Try a simpler description or switch to a more capable model in settings.'
                : error.message.includes('API key')
                    ? 'API key issue — check your key in module settings.'
                    : error.message.includes('Rate limit')
                        ? 'Rate limited — wait a moment and try again.'
                        : `Failed to create item: ${error.message}`;
            ui.notifications.error(userMsg);
            
            // Re-enable the create button
            html.closest('.dialog').find('[data-button="create"]').prop('disabled', false);
            statusEl.removeClass('status-visible').addClass('status-hidden');
            
            // Don't close dialog on error
            this.isDialogOpen = false;
            return false;
        }
    }

    /**
     * Build enhanced prompt with form context
     * @param {string} basePrompt - Base user prompt
     * @param {Object} formData - Form selection data
     * @returns {string} Enhanced prompt with context
     */
    buildEnhancedPrompt(basePrompt, formData) {
        let enhancedPrompt = basePrompt;
        const contextParts = [];

        // Add level guidance
        if (formData.level) {
            const level = parseInt(formData.level);
            const enhancement = this.getLevelToEnhancement(level);
            const priceRange = this.getLevelToPriceRange(level);
            contextParts.push(`Target Level: ${level} (${enhancement}, ${priceRange})`);
        }

        // Add category specifics
        if (formData.category) {
            contextParts.push(`Item Category: ${formData.category}`);
            
            if (formData.category === 'weapon') {
                if (formData.weaponType) {
                    contextParts.push(`Weapon Type: ${formData.weaponType}`);
                }
                if (formData.weaponSubtype) {
                    contextParts.push(`Specific Weapon: ${formData.weaponSubtype}`);
                }
            } else if (formData.category === 'armor') {
                if (formData.armorType) {
                    contextParts.push(`Armor Type: ${formData.armorType}`);
                }
                if (formData.armorSubtype) {
                    contextParts.push(`Specific Armor: ${formData.armorSubtype}`);
                }
            } else if (formData.category === 'equipment') {
                if (formData.equipmentType) {
                    contextParts.push(`Equipment Type: ${formData.equipmentType}`);
                }
                if (formData.equipmentSlot) {
                    contextParts.push(`Equipment Slot: ${formData.equipmentSlot}`);
                }
            }
        }

        // Add regional flavor
        if (formData.flavorRegion) {
            const flavorDescriptions = {
                'alkenstar': 'technological, firearm-focused, industrial aesthetic',
                'cheliax': 'infernal, noble, diabolic contracts and hellish themes',
                'varisia': 'frontier, ancient Thassilonian ruins, varied cultural influences',
                'osirion': 'desert, pharaonic, ancient Egyptian-inspired themes',
                'ustalav': 'gothic horror, haunted, dark and foreboding',
                'tian-xia': 'oriental, martial arts, honor-based culture',
                'mwangi': 'jungle, tribal, nature-based mysticism',
                'numeria': 'technological ruins, alien artifacts, post-apocalyptic sci-fi',
                'worldwound': 'demonic corruption, chaotic evil, planar invasion themes',
                'shackles': 'pirate, nautical, free-spirited seafaring culture',
                'linnorm-kings': 'viking, northern barbarian, runic magic',
                'brevoy': 'noble houses, political intrigue, chivalric traditions',
                'river-kingdoms': 'bandit lords, frontier justice, lawless territories',
                'mendev': 'crusader, holy warrior, righteous battle against evil',
                'qadira': 'trade empire, genie magic, merchant princes'
            };
            
            const flavorDesc = flavorDescriptions[formData.flavorRegion] || formData.flavorRegion;
            contextParts.push(`Regional Flavor: ${formData.flavorRegion} (${flavorDesc})`);
        }

        // Combine all context
        if (contextParts.length > 0) {
            enhancedPrompt += '\\n\\nAdditional Context:\\n' + contextParts.map(part => `• ${part}`).join('\\n');
        }

        return enhancedPrompt;
    }

    /**
     * Check if API is properly configured
     * @returns {boolean} True if API is configured
     */
    isAPIConfigured() {
        const provider = game.settings.get(this.moduleId, 'apiProvider');
        const apiKey = game.settings.get(this.moduleId, 'apiKey');
        const endpoint = game.settings.get(this.moduleId, 'apiEndpoint');

        if (provider === 'local') {
            return !!endpoint;
        }

        return !!(apiKey && endpoint);
    }

    /**
     * Show a quick item creation notification
     * @param {string} itemName - Name of the created item
     */
    showItemCreatedNotification(itemName) {
        const notification = $(`
            <div class="spacebone-notification">
                <i class="fas fa-magic"></i>
                <span>Created: ${itemName}</span>
            </div>
        `);

        $('body').append(notification);
        
        setTimeout(() => {
            notification.fadeOut(500, () => notification.remove());
        }, 3000);
    }
}
