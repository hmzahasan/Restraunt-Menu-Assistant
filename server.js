
import express from 'express';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import {
    AgentExecutor,
    createToolCallingAgent
} from '@langchain/classic/agents';

import { DynamicStructuredTool } from '@langchain/core/tools';

import {
    ChatPromptTemplate,
    MessagesPlaceholder
} from '@langchain/core/prompts';

dotenv.config();

// Initialize Express
const app = express();

app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));
// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini model
const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.5-flash-lite',
    maxOutputTokens: 2048,
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY
});

// Create Menu Tool
const getMenuTool = new DynamicStructuredTool({

    name: 'getMenu',

    description:
        'Returns the menu for a given category: breakfast, lunch, or dinner. Use this tool when the user asks about the menu.',

    schema: z.object({

        category: z.string().describe(
            'Food category: breakfast, lunch, or dinner'
        )

    }),

    func: async ({ category }) => {

        const menus = {

            breakfast: [
                'Pancakes with maple syrup',
                'Scrambled eggs with toast',
                'Fruit salad with yogurt'
            ],

            lunch: [
                'Grilled chicken salad',
                'Spaghetti Bolognese',
                'Vegetable stir-fry with tofu'
            ],

            dinner: [
                'Roast beef with vegetables',
                'Salmon fillet with rice',
                'Vegetable curry with naan bread'
            ]

        };

        const selectedMenu = menus[category.toLowerCase().trim()];

        if (!selectedMenu) {
            return 'Menu not available for the given category.';
        }

        return selectedMenu.join(', ');
    }

});

// Create Chat Prompt
const prompt = ChatPromptTemplate.fromMessages([

    [
        'system',
        `You are a helpful restaurant menu assistant.

        You can answer general questions politely.

        Whenever the user asks about breakfast, lunch, or dinner,
        use the getMenu tool to retrieve the menu.

        Never invent menu items.`
    ],

    ['human', '{input}'],

    new MessagesPlaceholder('agent_scratchpad')

]);

// Start Server



async function startServer() {

   
    try {

        // Create Tool Calling Agent
        const agent = await createToolCallingAgent({
    
            llm: model,
    
            tools: [getMenuTool],
    
            prompt
    
        });
    
        // Create Agent Executor
        const executor = new AgentExecutor({
    
            agent,
    
            tools: [getMenuTool],
    
            verbose: true
    
        });
    
        // Home Route
        app.get('/', (req, res) => {
    
            res.sendFile(path.join(__dirname, 'public','index.html'));
    
        });
    
        // Chat API
        
    app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
    
        
    
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Please provide a valid message.'
            });
        }
    
        const response = await executor.invoke({
            input: message
        });
    
        console.log('Agent response:', response);
    
        return res.status(200).json({
            reply: response.output
        });
    
    } catch (error) {
        console.error('========== CHAT ERROR ==========');
        console.error(error);
        console.error(error.stack);
        console.error('================================');
    
        return res.status(500).json({
            alert:('Unknown server error')
        });
    }
    });

        // Start Express Server
        app.listen(3000, () => {

            console.log('Server is running on http://localhost:3000');

        });
    }
        catch (error) {

            console.error('Server Initialization Error:', error);
    
        }
    }
  



 
// export default app;
startServer();
