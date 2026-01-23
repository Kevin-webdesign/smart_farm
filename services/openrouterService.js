// services/openrouterService.js
import axios from "axios";

/**
 * SMART FARMAI - External-only Smart Assistant
 */

export async function getBotReply(message) {
  try {
    const currentDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Kigali",
    });
    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Kigali",
    });
    const kigaliTimestamp = `${currentDate}, ${currentTime} Kigali Time`;

    // 🌍 STEP 1: Detect language (run only once)
    let detectedLang = "en";
    try {
      const detectRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "o3-mini",
          messages: [
            {
              role: "system",
              content:
                "Detect the language of this text and reply only with its ISO code (e.g., 'en', 'rw', 'fr'):",
            },
            { role: "user", content: message },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      detectedLang =
        detectRes.data.choices?.[0]?.message?.content?.trim().toLowerCase() ||
        "en";
    } catch {
      detectedLang = "en";
    }

    // ✅ Heuristic correction: detect short Kinyarwanda sentences
    if (
      ["ni", "nde", "iki", "ari", "uyu", "umuntu", "amakuru"].some((w) =>
        message.toLowerCase().includes(w)
      )
    ) {
      detectedLang = "rw";
    }

    console.log("🌐 Final detected language:", detectedLang);

    // 🌐 External-only AI generation
    const externalPrompt = `
You are SMART FARMMING AI, Rwanda's professional agricultural assistant.
Always use this live timestamp when generating or explaining market, transport, or agricultural data.

If today’s data is unavailable, use the latest verified dataset silently — do not mention data sources or APIs in your response.  
Focus on providing accurate, clear, and practical insights tailored for Rwandan farmers and agribusiness users.

**Core Data Sources (for external use)**
- eHaho – national e-commerce and buyer/seller marketplace.
- eSoko Rwanda – daily market commodity prices.
- Meteo Rwanda, RAB, MINAGRI, NAEB, Smart Nkunganire, and others.
- SMART FARMIoT sensors – soil, weather, and field monitoring.

**Priority Data Flow**
1. eSoko (market prices)
2. eHaho (buyer/seller & trade connections)
3. RTDA (transport and logistics)
4. Meteo Rwanda (weather)
5. RAB, NAEB, MINAGRI (advisory, policy, exports)


-------------------------------------------------------------
📘 SMART FARMAI BACKEND - Intelligence Layer Overview
-------------------------------------------------------------
SMART FARMAI acts as a central intelligence engine integrating Rwanda’s agricultural digital ecosystem to provide:
• Real-time price insights  
• Input availability and locations  
• Buyer and exporter connections  
• Logistics and transport coordination  
• Agronomic and weather advisory  
• Smart financial and cooperative linkages

**Main Functional Areas**
1. Farmer Query Orchestration Engine (FQOE)
   - Understands messages from farmers and classifies intent (price, market, disease, transport, etc.).

2. Smart App Integration (SMART FARMSuite)
   - AgriDoctor, AgriDealer Locator, AgriExpert Connect, AgriCoop Link, AgriPayment Portal.

3. National & Private Integration (Priority)
   - eSoko (Top Priority): show the real price at the market.
   - RTDA (High Priority): Provides vehicle and route data for logistics.
   - eSoko,ehaho , RAB, NAEB, Smart Nkunganire, Meteo Rwanda: Secondary sources.

**Goal**
Ensure every farmer in Rwanda receives instant, localized, and actionable agricultural intelligence powered by verified real-time data — timestamped for transparency but without displaying system sources.

Always answer in ${detectedLang}.
Begin your reply with:
"🕓 Updated on ${kigaliTimestamp}."

User question: "${message}"
    `;

    const extRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "o4-mini",
        messages: [{ role: "system", content: externalPrompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const extReply =
      extRes.data.choices?.[0]?.message?.content?.trim() ||
      "No external response.";

    return extReply;
  } catch (err) {
    console.error("❌ SMART FARMAI Error:", err.response?.data || err.message);
    throw new Error("Failed to get AI reply.");
  }
}
