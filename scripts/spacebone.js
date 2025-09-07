/**
 * Spacebone Item Creator for FoundryVTT PF1
 * AI-powered item creation assistant for Pathfinder 1e
 * 
 * @author Folken Games
 * @version 1.0.0
 */

import { SpaceboneAPI } from './api/llm-interface.js';
import { ItemFactory } from './factories/item-factory.js';
import { SpaceboneUI } from './ui/spacebone-ui.js';
import { FolderManager } from './utils/folder-manager.js';


/**
 * Main Spacebone module class
 */
class Spacebone {
    static ID = 'folken-games-spacebone';
    static NAME = 'Spacebone Item Creator';
    
    static api = null;
    static itemFactory = null;
    static ui = null;
    static folderManager = null;

    /**
     * Initialize the Spacebone module
     */
    static async initialize() {
        console.log(`${this.NAME} | Initializing...`);
        
        // Initialize core components
        this.api = new SpaceboneAPI();
        this.itemFactory = new ItemFactory();
        this.ui = new SpaceboneUI();
        this.folderManager = new FolderManager();
        
        // Register settings
        this.registerSettings();
        
        // Initialize API with current settings
        await this.api.initialize();
        
        // Setup hooks
        this.setupHooks();
        
        console.log(`${this.NAME} | Initialization complete`);
    }

    /**
     * Register module settings
     */
    static registerSettings() {
        // LLM API Configuration (v2.0)
        game.settings.register(this.ID, 'apiProvider', {
            name: 'spacebone.settings.apiProvider.name',
            hint: 'spacebone.settings.apiProvider.hint',
            scope: 'world',
            config: true,
            type: String,
                choices: {
                    'openai': 'OpenAI GPT (GPT-4o, GPT-4)',
                    'anthropic': 'Anthropic Claude (Claude 4)',
                    'gemini': 'Google Gemini (Gemini 2.0)',
                    'local': 'Local LLM (Ollama/LM Studio)'
                },
            default: 'openai',
            onChange: async (newProvider) => {
                // Auto-update endpoint and model when provider changes
                if (this.api && this.api.providerManager) {
                    console.log(`${this.NAME} | Provider changed to: ${newProvider}`);
                    
                    // Get default config for new provider
                    const ProviderClass = this.api.providerManager._providerClasses.get(newProvider);
                    if (ProviderClass) {
                        const defaultConfig = ProviderClass.getDefaultConfig();
                        
                        // Update endpoint
                        await game.settings.set(this.ID, 'apiEndpoint', defaultConfig.endpoint);
                        console.log(`${this.NAME} | Updated endpoint to: ${defaultConfig.endpoint}`);
                        
                        // Update model
                        await game.settings.set(this.ID, 'model', defaultConfig.model);
                        console.log(`${this.NAME} | Updated model to: ${defaultConfig.model}`);
                        
                        // Show notification
                        ui.notifications.info(`Spacebone: Updated to ${ProviderClass.getDisplayName()} - endpoint and model auto-configured`);
                    }
                }
            }
        });

        game.settings.register(this.ID, 'apiKey', {
            name: 'spacebone.settings.apiKey.name',
            hint: 'spacebone.settings.apiKey.hint',
            scope: 'world',
            config: true,
            type: String,
            default: '',
            onChange: async (newApiKey) => {
                if (newApiKey && this.api && this.api.providerManager) {
                    console.log(`${this.NAME} | API key changed, testing connection and fetching models...`);
                    try {
                        // Re-initialize the provider with new key
                        await this.api.providerManager.initializeFromSettings();
                        
                        // Test connection and fetch models
                        const provider = this.api.providerManager.getCurrentProvider();
                        if (provider && typeof provider.getAvailableModelsFromAPI === 'function') {
                            await provider.getAvailableModelsFromAPI();
                            ui.notifications.info('API key validated and models refreshed');
                        } else {
                            ui.notifications.info('API key updated');
                        }
                    } catch (error) {
                        console.error(`${this.NAME} | Failed to validate API key:`, error);
                        ui.notifications.warn('API key may be invalid - please check your settings');
                    }
                }
            }
        });

        game.settings.register(this.ID, 'apiEndpoint', {
            name: 'spacebone.settings.apiEndpoint.name',
            hint: 'spacebone.settings.apiEndpoint.hint',
            scope: 'world',
            config: true,
            type: String,
            default: 'https://api.openai.com/v1/chat/completions'
        });

        game.settings.register(this.ID, 'model', {
            name: 'spacebone.settings.model.name',
            hint: 'spacebone.settings.model.hint',
            scope: 'world',
            config: true,
            type: String,
            default: 'gpt-4o'
        });

        // Item Creation Settings
        game.settings.register(this.ID, 'folderName', {
            name: 'spacebone.settings.folderName.name',
            hint: 'spacebone.settings.folderName.hint',
            scope: 'world',
            config: true,
            type: String,
            default: 'Spacebone Items'
        });

        game.settings.register(this.ID, 'debugMode', {
            name: 'spacebone.settings.debugMode.name',
            hint: 'spacebone.settings.debugMode.hint',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        });

        // Add a button in the settings to open the item creator
        game.settings.register(this.ID, 'openItemCreatorButton', {
            name: 'spacebone.settings.openItemCreator.name',
            hint: 'spacebone.settings.openItemCreator.hint',
            scope: 'client',
            config: true,
            type: Boolean,
            default: false,
            onChange: (value) => {
                if (value && game.user.isGM) {
                    // Reset the setting and open the dialog
                    game.settings.set(this.ID, 'openItemCreatorButton', false);
                    if (this.ui) {
                        this.ui.openItemCreatorDialog();
                    }
                }
            }
        });
    }

    /**
     * Setup FoundryVTT hooks
     */
    static setupHooks() {
        console.log(`${this.NAME} | Setting up hooks, ui instance:`, this.ui);
        
        // Handle socket events for multiplayer support
        Hooks.on('ready', () => {
            game.socket.on(`module.${this.ID}`, this.handleSocketEvent.bind(this));
        });
    }

    /**
     * Handle socket events for multiplayer functionality
     * @param {Object} data - Socket event data
     */
    static handleSocketEvent(data) {
        if (this.getSetting('debugMode')) {
            console.log(`${this.NAME} | Socket event received:`, data);
        }
    }

    /**
     * Get a module setting value
     * @param {string} settingName - Name of the setting
     * @returns {any} Setting value
     */
    static getSetting(settingName) {
        return game.settings.get(this.ID, settingName);
    }

    /**
     * Create an item using LLM assistance
     * @param {string} prompt - User prompt for item creation
     * @returns {Promise<Item|null>} Created item or null if failed
     */
    static async createItem(prompt) {
        try {
            if (this.getSetting('debugMode')) {
                console.log(`${this.NAME} | Creating item with prompt:`, prompt);
            }

            // Generate item data using LLM
            const itemData = await this.api.generateItemData(prompt);
            
            if (!itemData) {
                ui.notifications.error('Failed to generate item data from LLM');
                return null;
            }

            // Convert LLM response to PF1 item
            const pf1ItemData = await this.itemFactory.createPF1Item(itemData);
            
            if (!pf1ItemData) {
                ui.notifications.error('Failed to convert item data to PF1 format');
                return null;
            }

            // Create the item directly in the world (no folder requirement)
            const item = await Item.create(pf1ItemData);

            if (item) {
                ui.notifications.info(`Created item: ${item.name}`);
                if (this.getSetting('debugMode')) {
                    console.log(`${this.NAME} | Created item:`, item);
                }
            }

            return item;

        } catch (error) {
            console.error(`${this.NAME} | Error creating item:`, error);
            ui.notifications.error('An error occurred while creating the item');
            return null;
        }
    }
}

// Hook registration exactly like pf1-magic-item-gen
Hooks.on("renderItemDirectory", (app, html, data) => {
    // Only show for GMs
    if (!game.user.isGM) return;

    // Copy pf1-magic-item-gen code exactly
    if (game.release.generation >= 13) {
        // For v13+, html is a raw DOM element
        const footer = html.querySelector('.directory-footer');
        if (!footer) return;
        
        // Check if button already exists
        if (footer.querySelector('#spaceboneButton')) return;
        
        const section = document.createElement('section');
        footer.append(section);
        section.classList.add('spacebone-generator', 'button-div');
        
        const spaceboneButton = document.createElement('button');
        spaceboneButton.type = 'button';
        spaceboneButton.classList.add('create-entity', 'spaceboneButton');
        spaceboneButton.id = 'spaceboneButton';
        section.append(spaceboneButton);
        spaceboneButton.addEventListener('click', () => {
            if (Spacebone.ui) {
                Spacebone.ui.openItemCreatorDialog();
            }
        });
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-skull'); // Skull icon for Spacebone!
        spaceboneButton.appendChild(icon);
        const innerText = document.createTextNode('Spacebone');
        spaceboneButton.appendChild(innerText);
    }
    else {
        // For legacy versions, html is a jQuery object
        if (html.find('#spaceboneButton').length > 0) return;
        
        const spaceboneButton = $("<button id='spaceboneButton' class='create-entity spaceboneButton'><i class='fas fa-skull'></i>Spacebone</button>");
        html.find(".directory-footer").append(spaceboneButton);
        spaceboneButton.click(() => {
            if (Spacebone.ui) {
                Spacebone.ui.openItemCreatorDialog();
            }
        });
    }
});

// Initialize module when ready
Hooks.once('ready', async () => {
    // Only initialize for GMs
    if (game.user.isGM) {
        await Spacebone.initialize();
    }
});

// Make Spacebone available globally for console access and other modules
globalThis.Spacebone = Spacebone;
