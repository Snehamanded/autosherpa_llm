# Gemini AI Dynamic Flow Setup Guide

## Overview
This guide explains how to set up the dynamic flow system using Google's Gemini AI for the WhatsApp car dealership bot.

## Prerequisites
1. Google Cloud Platform account
2. Gemini API access enabled
3. API key generated

## Setup Steps

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Environment Configuration
Add the following to your `.env` file:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies
The required package is already installed:
```bash
npm install @google/generative-ai
```

### 4. Features Enabled with Gemini

#### Dynamic Intent Recognition
- Natural language processing for user inputs
- Context-aware responses
- Multi-step conversation understanding
- Cross-step data extraction

#### Smart Flow Management
- Automatic step transitions
- Intelligent validation
- Fallback to static flow if Gemini fails
- Session state management

#### Enhanced User Experience
- More natural conversations
- Better error handling
- Contextual suggestions
- Personalized responses

## How It Works

### 1. Message Processing Flow
```
User Message → Gemini Analysis → Dynamic Response → Database Query → Formatted Response
```

### 2. Fallback System
If Gemini is unavailable or fails:
```
User Message → Static Flow → Traditional Validation → Response
```

### 3. Configuration Files
- `utils/geminiFlowService.js` - Gemini AI integration
- `utils/dynamicFlowManager.js` - Flow orchestration
- `utils/flowConfiguration.js` - Flow definitions and rules

## Testing

### 1. Test with Gemini Enabled
1. Set `GEMINI_API_KEY` in your environment
2. Start the bot: `npm run whatsapp`
3. Send messages to test dynamic responses

### 2. Test Fallback Mode
1. Remove or invalidate `GEMINI_API_KEY`
2. Start the bot: `npm run whatsapp`
3. Verify static flow still works

## Example Conversations

### With Gemini (Dynamic)
```
User: "I want to buy a Honda SUV under 10 lakhs"
Bot: "Perfect! I found some great Honda SUVs under ₹10 Lakhs. Let me show you the options..."

User: "Actually, I prefer Maruti instead"
Bot: "No problem! Let me switch to Maruti SUVs under ₹10 Lakhs. Here are your options..."
```

### Without Gemini (Static)
```
User: "I want to buy a Honda SUV under 10 lakhs"
Bot: "Great! We'll help you find cars. First, what's your budget range?"
User: "Under ₹5 Lakhs"
Bot: "Perfect! What type of car do you prefer?"
```

## Troubleshooting

### Common Issues

1. **Gemini API Key Invalid**
   - Check if the key is correctly set in `.env`
   - Verify the key is active in Google AI Studio

2. **Rate Limiting**
   - Gemini has rate limits
   - The system automatically falls back to static flow

3. **Response Parsing Errors**
   - Check console logs for parsing errors
   - System falls back to static flow automatically

### Debug Mode
Enable detailed logging by setting:
```env
DEBUG_GEMINI=true
```

## Performance Considerations

1. **Response Time**: Gemini adds ~1-2 seconds to response time
2. **Fallback**: Static flow is always available as backup
3. **Caching**: Consider implementing response caching for common queries

## Future Enhancements

1. **Custom Prompts**: Modify prompts in `geminiFlowService.js`
2. **Flow Customization**: Add new steps in `flowConfiguration.js`
3. **Analytics**: Track Gemini vs static flow usage
4. **A/B Testing**: Compare dynamic vs static performance
