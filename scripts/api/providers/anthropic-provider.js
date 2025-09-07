/**
 * @fileoverview Anthropic Claude API Provider
 * 
 * This file implements the Anthropic API provider for Claude models including Claude 4.
 * Handles communication with Anthropic's messages API.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * Anthropic Claude API provider implementation
 * Supports Claude 3, Claude 3.5, and Claude 4 models
 * 
 * @class AnthropicProvider
 * @extends BaseProvider
 */
export class AnthropicProvider extends BaseProvider {
    /**
     * Create a new Anthropic provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-5-sonnet-20241022',  // Use working Claude model
            defaultOptions: {
                max_tokens: 4000,  // Increased for longer descriptions
                temperature: 0.7,
                top_p: 0.9
            },
            ...config
        });
    }

    /**
     * Validate Anthropic configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.apiKey) {
            this.debug('No API key provided');
            return false;
        }
        
        if (!this.config.endpoint.includes('anthropic.com')) {
            this.debug('Invalid Anthropic endpoint');
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
     * Generate an item using Anthropic's API
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with Anthropic Claude', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('Anthropic provider is not properly configured');
            }

            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = `Create a Pathfinder 1e item: ${prompt}`;

            const requestData = {
                model: this.config.model,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                ...this.config.defaultOptions
            };

            this.debug('Sending request to Anthropic', requestData);

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Handle specific Anthropic error types
                switch (response.status) {
                    case 400:
                        throw new Error(`Invalid request: ${errorData.error?.message || 'Bad request - check your prompt formatting'}`);
                    case 401:
                        throw new Error('Invalid API key - check your Anthropic API key in settings');
                    case 403:
                        throw new Error('Permission denied - API key lacks required permissions');
                    case 429:
                        throw new Error('Rate limit exceeded - please try again later');
                    case 500:
                        throw new Error('Anthropic server error - please try again in a moment');
                    default:
                        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
                }
            }

            const data = await response.json();
            this.debug('Received response from Anthropic', data);

            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response format from Anthropic');
            }

            const generatedText = data.content[0].text;
            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Test connection to Anthropic API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing Anthropic connection');
            
            // Simple test message
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: 10,
                    messages: [
                        {
                            role: 'user',
                            content: 'Test'
                        }
                    ]
                })
            });

            if (!response.ok) {
                this.debug('Connection test failed', { status: response.status });
                return false;
            }

            const data = await response.json();
            this.debug('Connection test successful', data);
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
        return 'Anthropic Claude';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'anthropic';
    }

    /**
     * Get default configuration for Anthropic
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-5-sonnet-20241022',  // Use working Claude model
            defaultOptions: {
                max_tokens: 4000,  // Increased for longer descriptions
                temperature: 0.7,
                top_p: 0.9
            }
        };
    }

    /**
     * Get available Anthropic models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                description: 'Latest available Claude model with excellent performance and reasoning',
                recommended: true,
                maxTokens: 8192,
                costPer1kTokens: 0.015
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                description: 'Fast and cost-effective model for simpler tasks',
                recommended: false,
                maxTokens: 4096,
                costPer1kTokens: 0.005
            },
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                description: 'Most powerful Claude 3 model for complex reasoning tasks',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.015
            }
        ];
    }

    /**
     * Build Anthropic-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for Claude models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add Claude-specific instructions
        return `${basePrompt}

CRITICAL FORMATTING REQUIREMENTS:
- Respond ONLY with a valid JSON object
- Do not include any explanatory text before or after the JSON
- Use proper JSON syntax with double quotes for all strings
- Ensure all numeric values are properly formatted

Claude, please focus on creating mechanically accurate Pathfinder 1e items with rich descriptions that would fit seamlessly into a tabletop campaign.`;
    }
}
