// Multilingual AI Engine for Unified Inbox
// Supports Hindi, English, and Hinglish with Grounded RAG & Strict Factual Behavior

export interface BusinessContext {
  businessName: string;
  industry?: string | null;
  description?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessHours?: string | null;
  website?: string | null;
  faqs?: Array<{ question: string; answer: string }>;
  supportInstructions?: string | null;
  products?: Array<{ name: string; price: number; description?: string | null; category?: string | null }>;
  services?: Array<{ name: string; price: number; duration?: string | null; description?: string | null; category?: string | null }>;
  chunks?: Array<{ chunkText: string }>;
}

export interface AIResult {
  replyText: string;
  detectedLanguage: 'en' | 'hi' | 'hinglish';
  intent: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT';
  confidence: number;
  isEscalation: boolean;
  escalationReason?: string;
  source: 'GEMINI' | 'GROUNDED_ENGINE';
}

export class MultilingualAIEngine {
  /**
   * Detects whether the text is in Hindi (Devanagari), Hinglish (Romanized Hindi), or English
   */
  static detectLanguage(text: string): 'en' | 'hi' | 'hinglish' {
    const devanagariRegex = /[\u0900-\u097F]/;
    if (devanagariRegex.test(text)) {
      return 'hi';
    }

    const lower = text.toLowerCase();
    const hinglishTokens = [
      'kya', 'hai', 'hain', 'kaise', 'kitna', 'kitne', 'kab', 'kahan', 'batao',
      'bhai', 'mujhe', 'chahiye', 'chahiyeh', 'milega', 'hoga', 'nahi', 'nahi hai',
      'thoda', 'bhi', 'hum', 'aap', 'apka', 'tum', 'karo', 'kare', 'karna', 'shukriya',
      'dhanyawad', 'paas', 'mein', 'se', 'ko', 'accha', 'theek', 'kal', 'aaj', 'rate'
    ];

    const words = lower.split(/\s+/);
    let hinglishCount = 0;
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (hinglishTokens.includes(cleanWord)) {
        hinglishCount++;
      }
    }

    if (hinglishCount >= 1 || (words.length <= 4 && hinglishCount >= 1)) {
      return 'hinglish';
    }

    return 'en';
  }

  /**
   * Detects intent from customer message
   */
  static detectIntent(text: string): { intent: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT' } {
    const lower = text.toLowerCase();
    
    // Urgent / Escalation
    if (lower.includes('urgent') || lower.includes('emergency') || lower.includes('fraud') || lower.includes('scam') || lower.includes('angry') || lower.includes('lawyer') || lower.includes('court') || lower.includes('cheat')) {
      return { intent: 'ANGRY_COMPLAINT', sentiment: 'URGENT' };
    }
    
    // Business Hours
    if (lower.includes('time') || lower.includes('hour') || lower.includes('open') || lower.includes('close') || lower.includes('timing') || lower.includes('kab khulta') || lower.includes('kab band')) {
      return { intent: 'BUSINESS_HOURS', sentiment: 'NEUTRAL' };
    }

    // Location / Address
    if (lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('kahan') || lower.includes('map') || lower.includes('direction')) {
      return { intent: 'LOCATION_QUERY', sentiment: 'NEUTRAL' };
    }

    // Pricing / Cost / Products
    if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('fees') || lower.includes('kitna') || lower.includes('kitne') || lower.includes('product') || lower.includes('service') || lower.includes('charge')) {
      return { intent: 'PRICING_SPEC', sentiment: 'NEUTRAL' };
    }

    // Greeting
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('namaste') || lower.includes('pranam') || lower.includes('good morning') || lower.includes('good evening')) {
      return { intent: 'GREETING', sentiment: 'POSITIVE' };
    }

    return { intent: 'GENERAL_QUERY', sentiment: 'NEUTRAL' };
  }

  /**
   * Processes inbound message with business context and configuration options
   */
  static async processInboundMessage(
    messageText: string,
    context: BusinessContext,
    options?: { personality?: string | null; fallbackMessage?: string | null }
  ): Promise<AIResult> {
    return this.generateReply(messageText, context, options?.fallbackMessage || undefined);
  }

  /**
   * Generates a grounded reply based on business knowledge and customer language
   */
  static async generateReply(messageText: string, context: BusinessContext, fallbackConfig?: string): Promise<AIResult> {
    const lang = this.detectLanguage(messageText);
    const { intent, sentiment } = this.detectIntent(messageText);

    // If Gemini API Key is available, try external LLM
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const geminiReply = await this.callGemini(messageText, context, lang, fallbackConfig);
        if (geminiReply) {
          return {
            replyText: geminiReply,
            detectedLanguage: lang,
            intent,
            sentiment,
            confidence: 0.94,
            isEscalation: sentiment === 'URGENT',
            source: 'GEMINI'
          };
        }
      } catch (err) {
        console.warn('[AIEngine] Gemini call failed, using high-precision grounded heuristic engine:', err);
      }
    }

    // High-precision grounded RAG engine
    return this.executeGroundedEngine(messageText, context, lang, intent, sentiment, fallbackConfig);
  }

  /**
   * High-precision local grounded engine
   */
  private static executeGroundedEngine(
    text: string,
    context: BusinessContext,
    lang: 'en' | 'hi' | 'hinglish',
    intent: string,
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT',
    customFallback?: string
  ): AIResult {
    const lower = text.toLowerCase();
    const bName = context.businessName || 'our business';

    // 1. Escalation check
    if (sentiment === 'URGENT') {
      let reply = `I have flagged your request for immediate human attention. A senior team member from ${bName} will contact you shortly.`;
      if (lang === 'hi') {
        reply = `मैंने आपके संदेश को तुरंत प्राथमिकता पर रख दिया है। ${bName} के वरिष्ठ सदस्य जल्द ही आपसे संपर्क करेंगे।`;
      } else if (lang === 'hinglish') {
        reply = `Maine aapka message priority par escalate kar diya hai. ${bName} ki team se ek senior member jaldi aapse baat karenge.`;
      }
      return {
        replyText: reply,
        detectedLanguage: lang,
        intent,
        sentiment,
        confidence: 0.98,
        isEscalation: true,
        escalationReason: 'Customer message contains urgent/escalation keywords',
        source: 'GROUNDED_ENGINE'
      };
    }

    // 2. Greeting
    if (intent === 'GREETING') {
      let reply = `Hello! Welcome to ${bName}. How can I assist you with our services, pricing, or business hours today?`;
      if (lang === 'hi') {
        reply = `नमस्ते! ${bName} में आपका स्वागत है। मैं आज आपकी किस प्रकार सहायता कर सकता हूँ? आप हमारे समय, सेवाओं या कीमतों के बारे में पूछ सकते हैं।`;
      } else if (lang === 'hinglish') {
        reply = `Hello! ${bName} mein aapka swagat hai. Main aapki kya help kar sakta hoon? Aap hamari timing, services ya pricing ke baare mein pooch sakte hain.`;
      }
      return {
        replyText: reply,
        detectedLanguage: lang,
        intent,
        sentiment,
        confidence: 0.95,
        isEscalation: false,
        source: 'GROUNDED_ENGINE'
      };
    }

    // 3. Business Hours
    if (intent === 'BUSINESS_HOURS' && context.businessHours) {
      let reply = `Our business hours at ${bName} are: ${context.businessHours}.`;
      if (lang === 'hi') {
        reply = `${bName} के काम के घंटे हैं: ${context.businessHours}।`;
      } else if (lang === 'hinglish') {
        reply = `${bName} ke business hours hain: ${context.businessHours}.`;
      }
      return {
        replyText: reply,
        detectedLanguage: lang,
        intent,
        sentiment,
        confidence: 0.96,
        isEscalation: false,
        source: 'GROUNDED_ENGINE'
      };
    }

    // 4. Location / Address
    if (intent === 'LOCATION_QUERY' && context.location) {
      let reply = `${bName} is located at: ${context.location}.${context.contactPhone ? ` You can also reach us at ${context.contactPhone}.` : ''}`;
      if (lang === 'hi') {
        reply = `${bName} का पता है: ${context.location}।${context.contactPhone ? ` आप हमसे ${context.contactPhone} पर भी संपर्क कर सकते हैं।` : ''}`;
      } else if (lang === 'hinglish') {
        reply = `${bName} ka address hai: ${context.location}.${context.contactPhone ? ` Aap hume ${context.contactPhone} par bhi call kar sakte hain.` : ''}`;
      }
      return {
        replyText: reply,
        detectedLanguage: lang,
        intent,
        sentiment,
        confidence: 0.96,
        isEscalation: false,
        source: 'GROUNDED_ENGINE'
      };
    }

    // 5. Products & Services Match
    if (context.products && context.products.length > 0) {
      const matchedProd = context.products.find(p => lower.includes(p.name.toLowerCase()));
      if (matchedProd) {
        let reply = `${matchedProd.name} is available for $${matchedProd.price}. ${matchedProd.description || ''}`;
        if (lang === 'hi') {
          reply = `${matchedProd.name} ₹${matchedProd.price} में उपलब्ध है। ${matchedProd.description || ''}`;
        } else if (lang === 'hinglish') {
          reply = `${matchedProd.name} ka price ₹${matchedProd.price} hai. ${matchedProd.description || ''}`;
        }
        return {
          replyText: reply.trim(),
          detectedLanguage: lang,
          intent: 'PRICING_SPEC',
          sentiment,
          confidence: 0.92,
          isEscalation: false,
          source: 'GROUNDED_ENGINE'
        };
      }
    }

    if (context.services && context.services.length > 0) {
      const matchedServ = context.services.find(s => lower.includes(s.name.toLowerCase()));
      if (matchedServ) {
        let reply = `${matchedServ.name} is offered at $${matchedServ.price}${matchedServ.duration ? ` (${matchedServ.duration})` : ''}. ${matchedServ.description || ''}`;
        if (lang === 'hi') {
          reply = `${matchedServ.name} की फीस ₹${matchedServ.price}${matchedServ.duration ? ` (${matchedServ.duration})` : ''} है। ${matchedServ.description || ''}`;
        } else if (lang === 'hinglish') {
          reply = `${matchedServ.name} ka charge ₹${matchedServ.price}${matchedServ.duration ? ` (${matchedServ.duration})` : ''} hai. ${matchedServ.description || ''}`;
        }
        return {
          replyText: reply.trim(),
          detectedLanguage: lang,
          intent: 'PRICING_SPEC',
          sentiment,
          confidence: 0.92,
          isEscalation: false,
          source: 'GROUNDED_ENGINE'
        };
      }
    }

    // If asking generally about products/services/catalog
    if (intent === 'PRICING_SPEC') {
      const itemsList = [
        ...(context.products || []).map(p => `${p.name} ($${p.price})`),
        ...(context.services || []).map(s => `${s.name} ($${s.price})`)
      ].slice(0, 4);

      if (itemsList.length > 0) {
        let reply = `Here are some of our popular offerings at ${bName}: ${itemsList.join(', ')}. Would you like more details on any of these?`;
        if (lang === 'hi') {
          reply = `${bName} की प्रमुख सेवाएँ और उत्पाद: ${itemsList.join(', ')}। क्या आप इनमें से किसी के बारे में और जानना चाहते हैं?`;
        } else if (lang === 'hinglish') {
          reply = `${bName} ke popular offerings: ${itemsList.join(', ')}. Kya aap inme se kisi ke baare mein aur jaanna chahte hain?`;
        }
        return {
          replyText: reply,
          detectedLanguage: lang,
          intent,
          sentiment,
          confidence: 0.90,
          isEscalation: false,
          source: 'GROUNDED_ENGINE'
        };
      }
    }

    // 6. FAQs Match
    if (context.faqs && context.faqs.length > 0) {
      for (const faq of context.faqs) {
        const qWords = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchCount = qWords.filter(w => lower.includes(w)).length;
        if (matchCount >= 2 || (qWords.length <= 2 && matchCount >= 1)) {
          return {
            replyText: faq.answer,
            detectedLanguage: lang,
            intent: 'FAQ',
            sentiment,
            confidence: 0.88,
            isEscalation: false,
            source: 'GROUNDED_ENGINE'
          };
        }
      }
    }

    // 7. Knowledge Chunks Match
    if (context.chunks && context.chunks.length > 0) {
      for (const chunk of context.chunks) {
        const cLower = chunk.chunkText.toLowerCase();
        const words = lower.split(/\s+/).filter(w => w.length > 3);
        const matched = words.filter(w => cLower.includes(w));
        if (matched.length >= 2) {
          // Extract matching sentence or snippet
          const sentences = chunk.chunkText.split(/[.!?\n]+/);
          const bestSentence = sentences.find(s => words.some(w => s.toLowerCase().includes(w))) || chunk.chunkText.substring(0, 200);
          return {
            replyText: bestSentence.trim(),
            detectedLanguage: lang,
            intent: 'KNOWLEDGE_RETRIEVAL',
            sentiment,
            confidence: 0.85,
            isEscalation: false,
            source: 'GROUNDED_ENGINE'
          };
        }
      }
    }

    // 8. Strict Grounding Fallback (Do not hallucinate or invent answers)
    let fallback = customFallback || "I apologize, but I don't have that specific information right now. Please wait a moment while our team member assists you.";
    if (lang === 'hi') {
      fallback = "मुझे क्षमा करें, मेरे पास अभी यह जानकारी उपलब्ध नहीं है। कृपया थोड़ा इंतज़ार करें, हमारी टीम का सदस्य जल्द ही आपकी सहायता करेगा।";
    } else if (lang === 'hinglish') {
      fallback = "Sorry, mere paas abhi yeh information nahi hai. Please thoda wait kijiye, hamari team member jaldi hi aapki help karenge.";
    }

    return {
      replyText: fallback,
      detectedLanguage: lang,
      intent: 'UNKNOWN_FALLBACK',
      sentiment: 'NEUTRAL',
      confidence: 0.70,
      isEscalation: false,
      source: 'GROUNDED_ENGINE'
    };
  }

  /**
   * Gemini 2.5 API integration
   */
  private static async callGemini(
    prompt: string,
    context: BusinessContext,
    lang: 'en' | 'hi' | 'hinglish',
    customFallback?: string
  ): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const systemInstruction = `
You are the AI customer support representative for "${context.businessName}".
Grounding Rules:
- Answer ONLY using the provided business facts.
- Do NOT invent prices, discounts, products, services, or refund policies not mentioned in the context.
- The customer is speaking in language "${lang}" (en = English, hi = Hindi in Devanagari, hinglish = Romanized Hindi). Respond in the EXACT SAME language format.
- If you cannot find the answer in the provided business context, reply with this polite fallback:
  "${customFallback || 'I apologize, but I do not have that information right now. Please wait a moment while our team member assists you.'}"

Business Context:
- Description: ${context.description || 'N/A'}
- Industry: ${context.industry || 'N/A'}
- Hours: ${context.businessHours || 'N/A'}
- Address: ${context.location || 'N/A'}
- Contact: ${context.contactPhone || ''} ${context.contactEmail || ''}
- Products: ${JSON.stringify(context.products || [])}
- Services: ${JSON.stringify(context.services || [])}
- FAQs: ${JSON.stringify(context.faqs || [])}
- Instructions: ${context.supportInstructions || 'N/A'}
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 250
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? candidate.trim() : null;
  }
}
