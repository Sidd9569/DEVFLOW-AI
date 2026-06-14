const Product = require('../models/Product');
const User = require('../models/User');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const generateRoadmap = async (req, res) => {
  try {
    const { startupIdea, productName } = req.body;

    if (!startupIdea || !productName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startup idea and product name'
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      logger.warn('Gemini API key not configured, using fallback');
      return res.status(200).json({
        success: true,
        roadmap: getFallbackRoadmap(productName, startupIdea),
        note: 'Gemini API key not configured'
      });
    }

    logger.info(`Attempting Gemini API call for product: ${productName}`);

    try {
      // Use the new Google GenAI SDK
      const { GoogleGenAI } = require('@google/genai');
      
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const prompt = `You are an expert product manager and startup consultant. Based on this startup idea: "${startupIdea}", create a detailed, customized product roadmap for a product named "${productName}".

Please provide a comprehensive roadmap with the following structure:

**Phase 1 - MVP (Minimum Viable Product) - 4-6 weeks**
- Description: What are the essential features needed to launch?
- Features: List 4-5 specific features tailored to this startup idea

**Phase 2 - Growth & Expansion - 6-8 weeks**  
- Description: What features will help scale the product?
- Features: List 4-5 growth-focused features

**Phase 3 - Scale & Maturity - 8-12 weeks**
- Description: What advanced features will establish market leadership?
- Features: List 4-5 advanced features

Make all recommendations highly specific to: "${startupIdea}". Focus on what makes this product unique and valuable. Provide actionable, practical advice.`;

      logger.info('Sending request to Gemini API (using @google/genai)...');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      let text = response.text;
      
      if (!text) {
        throw new Error('No text response from Gemini API');
      }

      logger.info(`Gemini API response received. Response length: ${text.length}`);
      logger.info(`First 200 chars of response: ${text.substring(0, 200)}...`);

      // Parse the natural language response into structured format
      const structuredRoadmap = parseGeminiResponse(text, productName, startupIdea);

      logger.info(`Successfully processed Gemini response`);

      return res.status(200).json({
        success: true,
        roadmap: structuredRoadmap,
        source: 'gemini',
        rawResponse: text  // Include raw response for debugging
      });
    } catch (geminiError) {
      logger.error(`Gemini API error: ${geminiError.message}`);
      logger.error(`Error details: ${JSON.stringify(geminiError, Object.getOwnPropertyNames(geminiError))}`);
      
      return res.status(200).json({
        success: true,
        roadmap: getFallbackRoadmap(productName, startupIdea),
        source: 'fallback',
        error: geminiError.message
      });
    }
  } catch (error) {
    logger.error(`AI generation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error generating roadmap'
    });
  }
};

// Parse Gemini's natural language response into structured format
function parseGeminiResponse(text, productName, startupIdea) {
  // Try to extract phases from the text
  const phases = [];
  
  // Look for Phase 1, Phase 2, Phase 3 patterns
  const phasePatterns = [
    /Phase\s*1[^:]*:?\s*([^]*?)(?=Phase\s*2|$)/i,
    /Phase\s*2[^:]*:?\s*([^]*?)(?=Phase\s*3|$)/i,
    /Phase\s*3[^:]*:?\s*([^]*?)(?=Phase\s*4|$)/i
  ];
  
  const phaseNames = [
    'Phase 1 - MVP (Minimum Viable Product)',
    'Phase 2 - Growth & Expansion',
    'Phase 3 - Scale & Maturity'
  ];
  
  const defaultDurations = ['4-6 weeks', '6-8 weeks', '8-12 weeks'];
  
  for (let i = 0; i < 3; i++) {
    const match = text.match(phasePatterns[i]);
    let phaseText = match ? match[1] : '';
    
    // Extract features (look for bullet points or numbered lists)
    const features = [];
    const featurePatterns = [
      /[-•*]\s*([^\n]+)/g,
      /\d+\.\s*([^\n]+)/g
    ];
    
    for (const pattern of featurePatterns) {
      let featureMatch;
      while ((featureMatch = pattern.exec(phaseText)) !== null) {
        const feature = featureMatch[1].trim();
        // Filter out non-feature lines
        if (feature && !feature.toLowerCase().includes('description') && feature.length > 10) {
          features.push(feature);
        }
      }
    }
    
    // Extract description
    const descMatch = phaseText.match(/Description[:\s]*([^.*]+)/i);
    const description = descMatch ? descMatch[1].trim() : `Features for ${phaseNames[i]}`;
    
    // Use extracted features or generate from text
    const phaseFeatures = features.length > 0 ? features.slice(0, 5) : 
      extractKeyPhrases(phaseText, 4);
    
    phases.push({
      phase: phaseNames[i],
      description: description,
      features: phaseFeatures,
      duration: defaultDurations[i]
    });
  }
  
  // If we couldn't extract any phases, use fallback
  if (phases.every(p => p.features.length === 0)) {
    return getFallbackRoadmap(productName, startupIdea);
  }
  
  return {
    productName,
    startupIdea,
    generatedAt: new Date(),
    phases,
    aiGenerated: true,
    format: 'gemini-natural'
  };
}

// Extract key phrases from text when feature extraction fails
function extractKeyPhrases(text, count) {
  // Split by common delimiters and filter meaningful phrases
  const phrases = text
    .split(/[.,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 100)
    .slice(0, count);
  
  return phrases.length > 0 ? phrases : [
    'Feature 1',
    'Feature 2', 
    'Feature 3',
    'Feature 4'
  ];
}

function getFallbackRoadmap(productName, startupIdea) {
  return {
    productName,
    startupIdea,
    generatedAt: new Date(),
    phases: [
      {
        phase: 'Phase 1 - MVP',
        description: 'Core features to launch your product',
        features: [
          'User Authentication & Authorization',
          'Basic Dashboard',
          'Core Product Features',
          'Database Setup'
        ],
        duration: '4-6 weeks'
      },
      {
        phase: 'Phase 2 - Growth',
        description: 'Features to scale and grow',
        features: [
          'Advanced Analytics',
          'Team Collaboration Tools',
          'Third-party Integrations',
          'Performance Optimization'
        ],
        duration: '6-8 weeks'
      },
      {
        phase: 'Phase 3 - Scale',
        description: 'Advanced features for maturity',
        features: [
          'AI-Powered Features',
          'Mobile Application',
          'API Access',
          'Advanced Security'
        ],
        duration: '8-12 weeks'
      }
    ]
  };
}

module.exports = {
  generateRoadmap
};