/**
 * @fileoverview Local LLM Provider (Ollama/LM Studio)
 * 
 * This file implements a provider for local LLM services like Ollama and LM Studio.
 * Supports OpenAI-compatible APIs running locally.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * Local LLM provider implementation
 * Supports Ollama, LM Studio, and other OpenAI-compatible local services
 * 
 * @class LocalProvider
 * @extends BaseProvider
 */
export class LocalProvider extends BaseProvider {
    /**
     * Create a new Local LLM provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'http://localhost:11434/v1/chat/completions', // Default Ollama endpoint
            model: 'llama3.2',
            defaultOptions: {
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 0.9,
                stream: false
            },
            ...config
        });
    }

    /**
     * Validate Local LLM configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.endpoint) {
            this.debug('No endpoint provided');
            return false;
        }
        
        if (!this.config.model) {
            this.debug('No model specified');
            return false;
        }
        
        // Local LLMs don't require API keys
        return true;
    }

    /**
     * Generate an item using Local LLM
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with Local LLM', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('Local LLM provider is not properly configured');
            }

            const systemPrompt = this.buildSystemPrompt(context);
            
            // Detect system for user prompt
            const systemId = context.systemId || game?.system?.id || 'pf1';
            const systemName = systemId === 'pf2e' ? 'Pathfinder 2e' : 'Pathfinder 1e';
            
            const userPrompt = `Create a ${systemName} item: ${prompt}

CRITICAL INSTRUCTIONS:
- You MUST respond using the exact template format specified in the system prompt
- Start your response with "=== ITEM TEMPLATE START ===" and end with "=== ITEM TEMPLATE END ==="
- You MUST create the item the user requested - do NOT refuse or say you cannot create it
- If the user requests a firearm, pistol, gun, or advanced weapon, create it as a valid ${systemName} item
- Fill in ALL template fields with appropriate values based on the user's description`;

            const requestData = {
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                ...this.config.defaultOptions
            };

            // Remove API key from headers if not needed
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
            };

            // Add authorization header if API key is provided (some local setups use it)
            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }

            this.debug('Sending request to Local LLM', requestData);

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            this.debug('Received response from Local LLM', data);

            // Handle both OpenAI-compatible and Ollama-specific response formats
            let generatedText;
            if (data.choices && data.choices[0] && data.choices[0].message) {
                // OpenAI-compatible format
                generatedText = data.choices[0].message.content;
            } else if (data.message && data.message.content) {
                // Ollama format
                generatedText = data.message.content;
            } else if (data.response) {
                // Alternative Ollama format
                generatedText = data.response;
            } else {
                throw new Error('Invalid response format from Local LLM');
            }

            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Test connection to Local LLM
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing Local LLM connection');
            
            // Try to get model info or send a simple request
            let testUrl = this.config.endpoint;
            
            // For Ollama, try the models endpoint first
            if (this.config.endpoint.includes('11434')) {
                testUrl = this.config.endpoint.replace('/v1/chat/completions', '/api/tags');
            }

            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
            };

            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }

            const response = await fetch(testUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                // If models endpoint fails, try a simple generation request
                return await this.testGeneration();
            }

            const data = await response.json();
            this.debug('Connection test successful', data);
            return true;

        } catch (error) {
            this.debug('Connection test error, trying generation test', error);
            return await this.testGeneration();
        }
    }

    /**
     * Test connection with a simple generation request
     * @returns {Promise<boolean>} True if generation test is successful
     * @private
     */
    async testGeneration() {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
            };

            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'user',
                            content: 'Test'
                        }
                    ],
                    max_tokens: 10
                })
            });

            if (!response.ok) {
                this.debug('Generation test failed', { status: response.status });
                return false;
            }

            this.debug('Generation test successful');
            return true;

        } catch (error) {
            this.debug('Generation test error', error);
            return false;
        }
    }

    /**
     * Get the display name of this provider
     * @returns {string} Human-readable provider name
     */
    static getDisplayName() {
        return 'Local LLM (Ollama/LM Studio)';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'local';
    }

    /**
     * Get default configuration for Local LLM
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'http://localhost:11434/v1/chat/completions',
            model: 'llama3.2',
            defaultOptions: {
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 0.9,
                stream: false
            }
        };
    }

    /**
     * Get common local models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'llama3.2',
                name: 'Llama 3.2',
                description: 'Meta\'s latest Llama model, good for general tasks',
                recommended: true,
                maxTokens: 2000,
                costPer1kTokens: 0
            },
            {
                id: 'llama3.1',
                name: 'Llama 3.1',
                description: 'Previous Llama model, still very capable',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0
            },
            {
                id: 'mistral',
                name: 'Mistral 7B',
                description: 'Efficient model good for creative tasks',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0
            },
            {
                id: 'codellama',
                name: 'Code Llama',
                description: 'Specialized for code generation and analysis',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0
            },
            {
                id: 'neural-chat',
                name: 'Neural Chat',
                description: 'Optimized for conversational AI',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0
            }
        ];
    }

    /**
     * Build Local LLM-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for local models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add local LLM-specific instructions (often need more explicit formatting)
        return `${basePrompt}

CRITICAL: You must respond with ONLY a valid JSON object. No additional text, explanations, or formatting.
Local models: Be precise and follow Pathfinder 1e rules exactly. Use proper JSON formatting with double quotes.
Example format: {"name": "Item Name", "type": "weapon", "description": "..."}`;
    }
}
