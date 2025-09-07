/**
 * @fileoverview Google Gemini API Provider
 * 
 * This file implements the Google Gemini API provider for Gemini 2.0 models.
 * Handles communication with Google's generative AI API.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * Google Gemini API provider implementation
 * Supports Gemini 1.5 and Gemini 2.0 models
 * 
 * @class GeminiProvider
 * @extends BaseProvider
 */
export class GeminiProvider extends BaseProvider {
    /**
     * Create a new Gemini provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-2.0-pro',
            defaultOptions: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2000
            },
            ...config
        });
    }

    /**
     * Validate Gemini configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.apiKey) {
            this.debug('No API key provided');
            return false;
        }
        
        if (!this.config.endpoint.includes('googleapis.com')) {
            this.debug('Invalid Gemini endpoint');
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
     * Generate an item using Gemini's API
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with Gemini', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('Gemini provider is not properly configured');
            }

            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = `Create a Pathfinder 1e item: ${prompt}`;
            const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;

            const requestData = {
                contents: [
                    {
                        parts: [
                            {
                                text: fullPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: this.config.defaultOptions.temperature,
                    topK: this.config.defaultOptions.topK,
                    topP: this.config.defaultOptions.topP,
                    maxOutputTokens: this.config.defaultOptions.maxOutputTokens,
                    candidateCount: 1
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    }
                ]
            };

            const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
            
            this.debug('Sending request to Gemini', { url, requestData });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            this.debug('Received response from Gemini', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Invalid response format from Gemini');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Test connection to Gemini API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing Gemini connection');
            
            const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: 'Test'
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 10
                    }
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
        return 'Google Gemini';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'gemini';
    }

    /**
     * Get default configuration for Gemini
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-2.0-pro',
            defaultOptions: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2000
            }
        };
    }

    /**
     * Get available Gemini models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'gemini-2.0-pro',
                name: 'Gemini 2.0 Pro',
                description: 'Latest Gemini model with multimodal capabilities and extended context (2025)',
                recommended: true,
                maxTokens: 4000,
                costPer1kTokens: 0.02
            },
            {
                id: 'gemini-2.0-flash',
                name: 'Gemini 2.0 Flash',
                description: 'Fast and efficient Gemini 2.0 variant for quick responses',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.01
            },
            {
                id: 'gemini-1.5-pro',
                name: 'Gemini 1.5 Pro',
                description: 'Previous generation model with good performance',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.015
            },
            {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                description: 'Fast and cost-effective model for simpler tasks',
                recommended: false,
                maxTokens: 2000,
                costPer1kTokens: 0.005
            }
        ];
    }

    /**
     * Build Gemini-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for Gemini models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add Gemini-specific instructions
        return `${basePrompt}

RESPONSE FORMAT REQUIREMENTS:
- Generate ONLY valid JSON without any markdown formatting or code blocks
- Do not include backticks, "json" labels, or any other text
- Ensure the JSON is properly formatted and parseable
- Focus on mechanical accuracy for Pathfinder 1e rules

Gemini, please create a detailed and mechanically sound Pathfinder 1e item that would enhance gameplay.`;
    }
}
