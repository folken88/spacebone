/**
 * @fileoverview OpenAI API Provider
 * 
 * This file implements the OpenAI API provider for GPT models including GPT-5.
 * Handles communication with OpenAI's chat completions API.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * OpenAI API provider implementation
 * Supports GPT-3.5, GPT-4, and GPT-5 models
 * 
 * @class OpenAIProvider
 * @extends BaseProvider
 */
export class OpenAIProvider extends BaseProvider {
    /**
     * Create a new OpenAI provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o',
            defaultOptions: {
                max_tokens: 1000
            },
            ...config
        });
    }

    /**
     * Validate OpenAI configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.apiKey) {
            this.debug('No API key provided');
            return false;
        }
        
        if (!this.config.endpoint.includes('openai.com')) {
            this.debug('Invalid OpenAI endpoint');
            return false;
        }
        
        const validModels = this.constructor.getAvailableModels().map(m => m.id);
        if (!validModels.includes(this.config.model)) {
            this.debug(`Invalid model: ${this.config.model}`);
            return false;
        }
        
        return true;
    }

    /**
     * Generate an item using OpenAI's API
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with OpenAI', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('OpenAI provider is not properly configured');
            }

            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = `Create a Pathfinder 1e item: ${prompt}

IMPORTANT: You MUST respond using the exact template format specified in the system prompt. Start your response with "=== ITEM TEMPLATE START ===" and end with "=== ITEM TEMPLATE END ===".`;

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

            this.debug('Sending request to OpenAI', requestData);

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            this.debug('Received response from OpenAI', data);

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI');
            }

            const generatedText = data.choices[0].message.content;
            this.debug('Extracted content from OpenAI response:', generatedText);
            this.debug('Content length:', generatedText ? generatedText.length : 'null/undefined');
            
            if (!generatedText) {
                throw new Error('OpenAI returned empty content. Full response: ' + JSON.stringify(data, null, 2));
            }
            
            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Get available models from OpenAI API
     * @returns {Promise<Array>} Array of available models
     */
    async getAvailableModelsFromAPI() {
        try {
            this.debug('Fetching available models from OpenAI API');
            
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Filter to only chat completion models and sort by recency
            const chatModels = data.data
                .filter(model => model.id.includes('gpt') || model.id.includes('o1'))
                .map(model => ({
                    id: model.id,
                    name: model.id,
                    description: `OpenAI ${model.id}`,
                    recommended: model.id.includes('gpt-4') || model.id.includes('gpt-5') || model.id.includes('o1'),
                    created: model.created
                }))
                .sort((a, b) => b.created - a.created);

            this.debug('Available models from API:', chatModels);
            return chatModels;

        } catch (error) {
            this.debug('Failed to fetch models from API, using defaults', error);
            return this.constructor.getAvailableModels();
        }
    }

    /**
     * Test connection to OpenAI API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing OpenAI connection');
            
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            if (!response.ok) {
                this.debug('Connection test failed', { status: response.status });
                return false;
            }

            const data = await response.json();
            this.debug('Connection test successful', { modelCount: data.data?.length });
            return true;

        } catch (error) {
            this.debug('Connection test error', error);
            return false;
        }
    }

    /**
     * Get the display name of this provider
     * @returns {string} Human-readable provider name
     */
    static getDisplayName() {
        return 'OpenAI GPT';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'openai';
    }

    /**
     * Get default configuration for OpenAI
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o',
            defaultOptions: {
                max_tokens: 1000
            }
        };
    }

    /**
     * Get available OpenAI models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                description: 'Most capable model with superior reasoning and structured output (2024)',
                recommended: true,
                maxTokens: 4000,
                costPer1kTokens: 0.01
            },
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                description: 'Fast and capable model, good balance of quality and speed',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.01
            },
            {
                id: 'gpt-4',
                name: 'GPT-4',
                description: 'Previous generation model, still very capable',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.02
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                description: 'Fast and cost-effective model for simpler tasks',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0.002
            }
        ];
    }

    /**
     * Build OpenAI-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for OpenAI models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add OpenAI-specific instructions
        return `${basePrompt}

IMPORTANT: Your response MUST be valid JSON. Do not include any text before or after the JSON object.
Focus on creating mechanically sound and balanced items that fit Pathfinder 1e conventions.
Be creative with descriptions but precise with mechanical details.`;
    }
}
