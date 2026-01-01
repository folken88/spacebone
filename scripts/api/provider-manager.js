/**
 * @fileoverview AI Provider Manager
 * 
 * This file manages the registration and selection of AI providers.
 * It provides a unified interface for working with different AI services
 * and handles provider switching, configuration, and lifecycle management.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { LocalProvider } from './providers/local-provider.js';

/**
 * Manages AI providers and provides a unified interface
 * 
 * @class ProviderManager
 */
export class ProviderManager {
    /**
     * Create a new Provider Manager
     */
    constructor() {
        /**
         * Registry of available provider classes
         * @type {Map<string, typeof BaseProvider>}
         * @private
         */
        this._providerClasses = new Map();
        
        /**
         * Current active provider instance
         * @type {BaseProvider|null}
         * @private
         */
        this._currentProvider = null;
        
        /**
         * Provider configurations cache
         * @type {Map<string, Object>}
         * @private
         */
        this._providerConfigs = new Map();
        
        // Register default providers
        this.registerProvider(OpenAIProvider);
        this.registerProvider(AnthropicProvider);
        this.registerProvider(GeminiProvider);
        this.registerProvider(LocalProvider);
    }

    /**
     * Register a new AI provider class
     * @param {typeof BaseProvider} ProviderClass - The provider class to register
     */
    registerProvider(ProviderClass) {
        if (!ProviderClass.getId || !ProviderClass.getDisplayName) {
            throw new Error('Provider class must implement getId() and getDisplayName() static methods');
        }
        
        const providerId = ProviderClass.getId();
        this._providerClasses.set(providerId, ProviderClass);
        
        console.log(`[ProviderManager] Registered provider: ${ProviderClass.getDisplayName()} (${providerId})`);
    }

    /**
     * Get all available providers
     * @returns {Array<Object>} Array of provider info objects
     */
    getAvailableProviders() {
        return Array.from(this._providerClasses.entries()).map(([id, ProviderClass]) => ({
            id: id,
            name: ProviderClass.getDisplayName(),
            models: ProviderClass.getAvailableModels(),
            defaultConfig: ProviderClass.getDefaultConfig()
        }));
    }

    /**
     * Get provider information by ID
     * @param {string} providerId - The provider ID
     * @returns {Object|null} Provider information or null if not found
     */
    getProviderInfo(providerId) {
        const ProviderClass = this._providerClasses.get(providerId);
        if (!ProviderClass) {
            return null;
        }
        
        return {
            id: providerId,
            name: ProviderClass.getDisplayName(),
            models: ProviderClass.getAvailableModels(),
            defaultConfig: ProviderClass.getDefaultConfig()
        };
    }

    /**
     * Set the active provider
     * @param {string} providerId - The provider ID to activate
     * @param {Object} config - Provider configuration
     * @returns {Promise<boolean>} True if provider was set successfully
     */
    async setActiveProvider(providerId, config = {}) {
        try {
            const ProviderClass = this._providerClasses.get(providerId);
            if (!ProviderClass) {
                throw new Error(`Unknown provider: ${providerId}`);
            }

            // Merge with default config
            const defaultConfig = ProviderClass.getDefaultConfig();
            const finalConfig = { ...defaultConfig, ...config };

            // Create new provider instance
            const provider = new ProviderClass(finalConfig);
            
            // Validate configuration
            if (!provider.validateConfiguration()) {
                throw new Error(`Invalid configuration for provider: ${providerId}`);
            }

            // Store configuration for future use
            this._providerConfigs.set(providerId, finalConfig);
            
            // Set as current provider
            this._currentProvider = provider;
            
            console.log(`[ProviderManager] Active provider set to: ${ProviderClass.getDisplayName()}`);
            return true;

        } catch (error) {
            console.error(`[ProviderManager] Failed to set active provider: ${error.message}`);
            return false;
        }
    }

    /**
     * Get the current active provider
     * @returns {BaseProvider|null} Current provider or null if none set
     */
    getCurrentProvider() {
        return this._currentProvider;
    }

    /**
     * Generate an item using the current provider
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        if (!this._currentProvider) {
            throw new Error('No active provider set. Please configure an AI provider first.');
        }

        if (!this._currentProvider.isConfigured) {
            throw new Error('Current provider is not properly configured.');
        }

        return await this._currentProvider.generateItem(prompt, context);
    }

    /**
     * Generate actor data using the current provider
     * @param {string} prompt - User's actor creation prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated actor data
     */
    async generateActor(prompt, context = {}) {
        if (!this._currentProvider) {
            throw new Error('No active provider set. Please configure an AI provider first.');
        }

        if (!this._currentProvider.isConfigured) {
            throw new Error('Current provider is not properly configured.');
        }

        return await this._currentProvider.generateActor(prompt, context);
    }

    /**
     * Test connection for a specific provider
     * @param {string} providerId - The provider ID to test
     * @param {Object} config - Provider configuration to test
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testProviderConnection(providerId, config = {}) {
        try {
            const ProviderClass = this._providerClasses.get(providerId);
            if (!ProviderClass) {
                throw new Error(`Unknown provider: ${providerId}`);
            }

            // Merge with default config
            const defaultConfig = ProviderClass.getDefaultConfig();
            const finalConfig = { ...defaultConfig, ...config };

            // Create temporary provider instance for testing
            const provider = new ProviderClass(finalConfig);
            
            return await provider.testConnection();

        } catch (error) {
            console.error(`[ProviderManager] Connection test failed for ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Get cached configuration for a provider
     * @param {string} providerId - The provider ID
     * @returns {Object|null} Cached configuration or null if not found
     */
    getCachedConfig(providerId) {
        return this._providerConfigs.get(providerId) || null;
    }

    /**
     * Update configuration for a provider
     * @param {string} providerId - The provider ID
     * @param {Object} config - New configuration
     * @returns {boolean} True if configuration was updated successfully
     */
    updateProviderConfig(providerId, config) {
        try {
            const ProviderClass = this._providerClasses.get(providerId);
            if (!ProviderClass) {
                return false;
            }

            // Merge with existing config
            const existingConfig = this._providerConfigs.get(providerId) || {};
            const finalConfig = { ...existingConfig, ...config };
            
            // Store updated configuration
            this._providerConfigs.set(providerId, finalConfig);

            // If this is the current provider, update it
            if (this._currentProvider && this._currentProvider.constructor.getId() === providerId) {
                this.setActiveProvider(providerId, finalConfig);
            }

            return true;

        } catch (error) {
            console.error(`[ProviderManager] Failed to update config for ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Initialize provider manager from FoundryVTT settings
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initializeFromSettings() {
        try {
            // Get current provider setting
            const currentProviderId = game.settings.get('folken-games-spacebone', 'apiProvider');
            
            if (!currentProviderId) {
                console.log('[ProviderManager] No provider configured in settings');
                return false;
            }

            // Get provider class for defaults
            const ProviderClass = this._providerClasses.get(currentProviderId);
            if (!ProviderClass) {
                console.error(`[ProviderManager] Unknown provider: ${currentProviderId}`);
                return false;
            }

            // Get default config for this provider
            const defaultConfig = ProviderClass.getDefaultConfig();
            
            // Build configuration from settings
            const config = {
                apiKey: game.settings.get('folken-games-spacebone', 'apiKey'),
                endpoint: game.settings.get('folken-games-spacebone', 'apiEndpoint'),
                model: game.settings.get('folken-games-spacebone', 'model')
            };

            // Auto-update endpoint and model if they don't match the provider
            let needsUpdate = false;
            
            // Check if endpoint needs updating for any provider mismatch
            let shouldUpdateEndpoint = false;
            
            if (currentProviderId === 'anthropic' && !config.endpoint.includes('anthropic.com')) {
                shouldUpdateEndpoint = true;
            } else if (currentProviderId === 'openai' && !config.endpoint.includes('openai.com')) {
                shouldUpdateEndpoint = true;
            } else if (currentProviderId === 'gemini' && !config.endpoint.includes('generativelanguage.googleapis.com')) {
                shouldUpdateEndpoint = true;
            } else if (currentProviderId === 'local' && (config.endpoint.includes('anthropic.com') || config.endpoint.includes('openai.com') || config.endpoint.includes('googleapis.com'))) {
                shouldUpdateEndpoint = true;
            }
            
            if (shouldUpdateEndpoint) {
                config.endpoint = defaultConfig.endpoint;
                await game.settings.set('folken-games-spacebone', 'apiEndpoint', config.endpoint);
                needsUpdate = true;
            }
            
            // Check if model needs updating (basic validation)
            const validModels = ProviderClass.getAvailableModels().map(m => m.id);
            if (!validModels.includes(config.model)) {
                config.model = defaultConfig.model;
                await game.settings.set('folken-games-spacebone', 'model', config.model);
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                console.log(`[ProviderManager] Auto-updated settings for provider: ${currentProviderId}`);
                ui.notifications.info(`Spacebone: Auto-updated endpoint and model for ${ProviderClass.getDisplayName()}`);
            }

            // Set active provider
            const success = await this.setActiveProvider(currentProviderId, config);
            
            // Note: Model fetching now only happens when API key changes
            
            return success;

        } catch (error) {
            console.error('[ProviderManager] Failed to initialize from settings:', error);
            return false;
        }
    }

    /**
     * Save current provider configuration to FoundryVTT settings
     * @returns {Promise<boolean>} True if settings were saved successfully
     */
    async saveToSettings() {
        try {
            if (!this._currentProvider) {
                console.log('[ProviderManager] No current provider to save');
                return false;
            }

            const providerId = this._currentProvider.constructor.getId();
            const config = this._currentProvider.config;

            // Save to FoundryVTT settings
            await game.settings.set('folken-games-spacebone', 'apiProvider', providerId);
            await game.settings.set('folken-games-spacebone', 'apiKey', config.apiKey || '');
            await game.settings.set('folken-games-spacebone', 'apiEndpoint', config.endpoint || '');
            await game.settings.set('folken-games-spacebone', 'model', config.model || '');

            console.log('[ProviderManager] Configuration saved to settings');
            return true;

        } catch (error) {
            console.error('[ProviderManager] Failed to save to settings:', error);
            return false;
        }
    }

    /**
     * Get usage statistics for providers
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        // TODO: Implement usage tracking
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            providerBreakdown: {}
        };
    }

    /**
     * Refresh available models from current provider's API
     * @returns {Promise<Array>} Available models or empty array if failed
     */
    async refreshAvailableModels() {
        try {
            if (!this._currentProvider || typeof this._currentProvider.getAvailableModelsFromAPI !== 'function') {
                return [];
            }

            console.log('[ProviderManager] Refreshing available models from API...');
            const models = await this._currentProvider.getAvailableModelsFromAPI();
            
            if (models && models.length > 0) {
                console.log(`[ProviderManager] Found ${models.length} available models`);
                // Update the static models list in the provider class
                const providerId = this._currentProvider.constructor.getId();
                this._availableModels = this._availableModels || new Map();
                this._availableModels.set(providerId, models);
                
                // Show notification with recommended models
                const recommended = models.filter(m => m.recommended).slice(0, 3);
                if (recommended.length > 0) {
                    const modelNames = recommended.map(m => m.id).join(', ');
                    ui.notifications.info(`Spacebone: Found models - recommended: ${modelNames}`);
                }
            }
            
            return models;

        } catch (error) {
            console.error('[ProviderManager] Failed to refresh models:', error);
            return [];
        }
    }

    /**
     * Get available models for a provider (cached or from API)
     * @param {string} providerId - Provider ID
     * @returns {Array} Available models
     */
    getAvailableModels(providerId) {
        // Try cached models first
        if (this._availableModels && this._availableModels.has(providerId)) {
            return this._availableModels.get(providerId);
        }
        
        // Fall back to static models
        const ProviderClass = this._providerClasses.get(providerId);
        return ProviderClass ? ProviderClass.getAvailableModels() : [];
    }

    /**
     * Clear all cached configurations
     */
    clearCache() {
        this._providerConfigs.clear();
        this._availableModels = new Map();
        console.log('[ProviderManager] Configuration cache cleared');
    }
}
