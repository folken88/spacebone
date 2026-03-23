/**
 * @fileoverview Spacebone LLM API Interface
 * 
 * This file provides a high-level interface for AI item generation.
 * It uses the ProviderManager to handle different AI services and provides
 * simplified methods for the UI layer to generate items.
 * 
 * @author Spacebone Development Team
 * @version 2.0.0
 * @since 2025-09-01
 */

import { ProviderManager } from './provider-manager.js';

/**
 * Main API interface for AI-powered item generation
 * Provides a simplified interface over the provider system
 * 
 * @class SpaceboneAPI
 */
export class SpaceboneAPI {
    /**
     * Create a new Spacebone API instance
     */
    constructor() {
        /**
         * Provider manager instance
         * @type {ProviderManager}
         * @private
         */
        this.providerManager = new ProviderManager();
        
        /**
         * Request history for debugging and analytics
         * @type {Array<Object>}
         * @private
         */
        this.requestHistory = [];
        
        /**
         * Maximum number of history entries to keep
         * @type {number}
         * @private
         */
        this.maxHistorySize = 100;
        
        /**
         * Module ID for settings
         * @type {string}
         * @private
         */
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Initialize the API with settings from FoundryVTT
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initialize() {
        try {
            console.log('[SpaceboneAPI] Initializing API...');
            
            // Initialize provider manager from settings
            const success = await this.providerManager.initializeFromSettings();
            
            if (success) {
                console.log('[SpaceboneAPI] API initialized successfully');
            } else {
                console.log('[SpaceboneAPI] API initialized, but no provider configured');
            }
            
            return true;
        } catch (error) {
            console.error('[SpaceboneAPI] Failed to initialize API:', error);
            return false;
        }
    }

    /**
     * Generate item data from user prompt using configured AI provider
     * @param {string} prompt - User's item creation prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItemData(prompt, context = {}) {
        const startTime = Date.now();
        let request = null;
        
        try {
            // Validate input
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('Invalid prompt provided');
            }

            // Re-initialize provider from current settings (in case they changed)
            await this.providerManager.initializeFromSettings();
            
            // Get current provider
            const provider = this.providerManager.getCurrentProvider();
            if (!provider) {
                throw new Error('No AI provider configured. Please configure an AI provider in the module settings.');
            }

            // Log request
            request = {
                id: this.generateRequestId(),
                timestamp: new Date().toISOString(),
                prompt: prompt.trim(),
                context: context,
                provider: provider.constructor.getDisplayName(),
                startTime: startTime
            };

            console.log('[SpaceboneAPI] Generating item:', request);

            // Add system context for proper prompt generation
            const systemId = game?.system?.id || 'pf1';
            const enhancedContext = {
                ...context,
                systemId: systemId
            };
            
            // Generate item using provider (with retry on template parse failure)
            let itemData;
            let lastError;
            const maxAttempts = 2;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    itemData = await this.providerManager.generateItem(prompt.trim(), enhancedContext);
                    break; // Success
                } catch (err) {
                    lastError = err;
                    if (attempt < maxAttempts && err.message.includes('template format')) {
                        console.warn(`[SpaceboneAPI] Attempt ${attempt} failed (template parse), retrying...`);
                        ui.notifications.warn(`Generation attempt ${attempt} failed, retrying with stricter prompt...`);
                        // Retry with a simplified context hint
                        enhancedContext._retryAttempt = attempt;
                    } else {
                        throw err;
                    }
                }
            }

            if (!itemData) throw lastError;

            // Calculate response time
            const responseTime = Date.now() - startTime;
            
            // Update request with result
            request.endTime = Date.now();
            request.responseTime = responseTime;
            request.success = true;
            request.itemData = itemData;
            
            // Add to history
            this.addToHistory(request);
            
            console.log(`[SpaceboneAPI] Item generated successfully in ${responseTime}ms`);
            return itemData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Update request with error
            if (request) {
                request.endTime = Date.now();
                request.responseTime = responseTime;
                request.success = false;
                request.error = error.message;
                this.addToHistory(request);
            }
            
            console.error('[SpaceboneAPI] Failed to generate item:', error);
            throw error;
        }
    }

    /**
     * Generate actor data from user prompt using configured AI provider
     * @param {string} prompt - User's actor creation prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated actor data
     */
    async generateActorData(prompt, context = {}) {
        const startTime = Date.now();
        let request = null;
        
        try {
            // Validate input
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('Invalid prompt provided');
            }

            // Re-initialize provider from current settings (in case they changed)
            await this.providerManager.initializeFromSettings();
            
            // Get current provider
            const provider = this.providerManager.getCurrentProvider();
            if (!provider) {
                throw new Error('No AI provider configured. Please configure an AI provider in the module settings.');
            }

            // Log request
            request = {
                id: this.generateRequestId(),
                timestamp: new Date().toISOString(),
                prompt: prompt.trim(),
                context: context,
                provider: provider.constructor.getDisplayName(),
                startTime: startTime
            };

            console.log('[SpaceboneAPI] Generating actor:', request);

            // Add system context
            const systemId = game?.system?.id || 'pf1';
            const enhancedContext = {
                ...context,
                systemId: systemId
            };
            
            // Generate actor using provider
            const actorData = await this.providerManager.generateActor(prompt.trim(), enhancedContext);
            
            // Calculate response time
            const responseTime = Date.now() - startTime;
            
            // Update request with result
            request.endTime = Date.now();
            request.responseTime = responseTime;
            request.success = true;
            request.actorData = actorData;
            
            // Add to history
            this.addToHistory(request);
            
            console.log(`[SpaceboneAPI] Actor generated successfully in ${responseTime}ms`);
            return actorData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Update request with error
            if (request) {
                request.endTime = Date.now();
                request.responseTime = responseTime;
                request.success = false;
                request.error = error.message;
                this.addToHistory(request);
            }
            
            console.error(`[SpaceboneAPI] Error generating actor:`, error);
            throw error;
        }
    }

    /**
     * Get available AI providers
     * @returns {Array<Object>} Array of provider information
     */
    getAvailableProviders() {
        return this.providerManager.getAvailableProviders();
    }

    /**
     * Configure and set the active AI provider
     * @param {string} providerId - The provider ID to activate
     * @param {Object} config - Provider configuration
     * @returns {Promise<boolean>} True if provider was configured successfully
     */
    async configureProvider(providerId, config) {
        try {
            console.log(`[SpaceboneAPI] Configuring provider: ${providerId}`);
            
            const success = await this.providerManager.setActiveProvider(providerId, config);
            
            if (success) {
                // Save configuration to FoundryVTT settings
                await this.providerManager.saveToSettings();
                console.log(`[SpaceboneAPI] Provider ${providerId} configured and saved`);
            }
            
            return success;
        } catch (error) {
            console.error(`[SpaceboneAPI] Error configuring provider ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Test connection to a specific provider
     * @param {string} providerId - The provider ID to test
     * @param {Object} config - Provider configuration to test
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testProviderConnection(providerId, config) {
        try {
            console.log(`[SpaceboneAPI] Testing connection to ${providerId}`);
            
            const success = await this.providerManager.testProviderConnection(providerId, config);
            
            console.log(`[SpaceboneAPI] Connection test for ${providerId}: ${success ? 'SUCCESS' : 'FAILED'}`);
            return success;
        } catch (error) {
            console.error(`[SpaceboneAPI] Error testing ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Get the current active provider
     * @returns {Object|null} Current provider information or null if none set
     */
    getCurrentProvider() {
        const provider = this.providerManager.getCurrentProvider();
        if (!provider) {
            return null;
        }
        
        return {
            id: provider.constructor.getId(),
            name: provider.constructor.getDisplayName(),
            model: provider.config.model,
            configured: provider.isConfigured
        };
    }

    /**
     * Generate a unique request ID
     * @returns {string} Unique request ID
     * @private
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add request to history with size management
     * @param {Object} request - Request object to add
     * @private
     */
    addToHistory(request) {
        this.requestHistory.push(request);
        
        // Maintain history size limit
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
        }
    }
}
