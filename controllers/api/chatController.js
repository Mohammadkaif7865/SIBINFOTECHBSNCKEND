const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
const axios = require('axios');

const https = require("https");
const http = require("http");
const { URL } = require("url");

const chatbotHandler = async (req, res) => {
  const action = req.body.action;
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const query = req.body.query;
  const session_id = req.body.session_id || 'chat_' + Date.now();

  if (action === 'insert_lead') {
    if (!name || !email || !phone || !query) {
      return res.json({ success: false, error: 'All fields are required.' });
    }

    let createdAt = dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss");

    let leadInsert = `INSERT INTO leads (name, email, phone, query, created_at) VALUES (?, ?, ?, ?, ?)`;
    let convoInsert = `INSERT INTO conversations (session_id, sender, message, created_at) VALUES (?, ?, ?, ?)`;

    connection.query(leadInsert, [name, email, phone, query, createdAt], function (err) {
      if (err) return res.json({ success: false, error: 'Lead insertion failed.' });

      connection.query(convoInsert, [session_id, 'user', query, createdAt], async function (err2) {
        if (err2) return res.json({ success: false, error: 'Conversation insert failed.' });

        let botResponse = await getOpenAIResponse(query);
        connection.query(convoInsert, [session_id, 'assistant', botResponse, createdAt]);

        res.json({
          success: true,
          session_id: session_id,
          response: botResponse
        });
      });
    });

  } else if (action === 'send_message') {
    if (!req.body.message || !req.body.session_id) {
      return res.json({ success: false, error: 'Message and session_id are required.' });
    }

    const message = req.body.message;
    const createdAt = dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss");

    let convoInsert = `INSERT INTO conversations (session_id, sender, message, created_at) VALUES (?, ?, ?, ?)`;

    connection.query(convoInsert, [session_id, 'user', message, createdAt], async function (err) {
      if (err) return res.json({ success: false, error: 'Message insert failed.' });

      let botResponse = await getOpenAIResponse(message);
      connection.query(convoInsert, [session_id, 'assistant', botResponse, createdAt]);

      res.json({
        success: true,
        response: botResponse
      });
    });
  } else {
    res.json({ success: false, error: 'Invalid action' });
  }
};

const getOpenAIResponse = async (message) => {
  const apiKey = process.env.AI_API_KEY;

  console.log(apiKey);

  if (!apiKey) return "OpenAI API key not configured.";

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: "You are Ishaan, a helpful and professional Pre-Sales Executive at SIB Infotech. Suggest digital marketing solutions like SEO, PPC, Social Media, Website Development, etc. Respond politely, briefly, and without asking for personal contact details."
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    return "I'm having trouble processing your message. Please try again shortly.";
  }
};


const fetchRedirectChain = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required." });
  }

  try {
    let chain = [];
    let currentUrl = url.startsWith("http") ? url : `http://${url}`;
    let maxRedirects = 10;

    for (let i = 0; i < maxRedirects; i++) {
      const response = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      chain.push({
        url: currentUrl,
        status_code: response.status,
        redirect_note: [301, 302, 303, 307, 308].includes(response.status)
          ? "Redirected"
          : "No Redirect",
      });

      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        const location = response.headers.location;
        currentUrl = new URL(location, currentUrl).toString();
      } else {
        break;
      }
    }

    res.json({
      success: true,
      chain,
      final_url: currentUrl,
      final_status_code: chain[chain.length - 1].status_code,
    });
  } catch (error) {
    console.error("Redirect chain error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch redirect chain." });
  }
};


const paragraphRewriter = async (req, res) => {
  const { paragraph, tone = "Professional", style = "nochange" } = req.body;

  if (!paragraph) {
    return res.status(400).json({ success: false, message: "Paragraph is required." });
  }

  let prompt = `You are a professional content writer. Rewrite the paragraph below in a ${tone} tone. `;

  if (style === "shorten") {
    prompt += "Make it concise but preserve the key message. ";
  } else if (style === "expand") {
    prompt += "Add relevant detail to make it slightly more comprehensive. ";
  } else {
    prompt += "Preserve the structure and flow. ";
  }

  prompt += `Avoid casual openers like 'Hey there'. Do not use greetings or exclamations. Maintain a formal, business-oriented tone.\n\nParagraph:\n"${paragraph}"\n\nRewritten:`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rewritten = response.data.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ success: true, rewritten });
  } catch (err) {
    console.error("OpenAI Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to rewrite paragraph. Please try again later.",
    });
  }
};


const sentenceRewriter = async (req, res) => {
  const { sentence, tone = "Professional", style = "nochange" } = req.body;

  if (!sentence) {
    return res.status(400).json({ success: false, message: "Sentence is required." });
  }

  let prompt = `You are a professional content writer. Rewrite the following sentence in a ${tone} tone. `;

  if (style === "shorten") {
    prompt += "Make it concise but clear. ";
  } else if (style === "expand") {
    prompt += "Add slightly more detail while keeping the message clear. ";
  } else {
    prompt += "Keep the sentence structure mostly unchanged. ";
  }

  prompt += `Avoid casual expressions like 'Hey there'. Maintain a professional, business-oriented tone.\n\nSentence:\n"${sentence}"\n\nRewritten:`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rewritten = response.data.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ success: true, rewritten });
  } catch (err) {
    console.error("OpenAI Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to rewrite sentence. Please try again later.",
    });
  }
};

const serpFetch = async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, message: "Invalid URL." });
  }

  try {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    client
      .get(url, { timeout: 10000 }, (response) => {
        let html = "";

        response.on("data", (chunk) => {
          html += chunk;
        });

        response.on("end", () => {
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          const metaMatch = html.match(
            /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
          );

          const title = titleMatch ? titleMatch[1].trim() : "";
          const description = metaMatch ? metaMatch[1].trim() : "";

          return res.json({
            success: true,
            title,
            description,
            url,
          });
        });
      })
      .on("error", (err) => {
        console.error("HTTP fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch meta data. Please try again later.",
        });
      });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process URL. Please try again later.",
    });
  }
};

const fetchTitleMeta = async (req, res) => {
  const { url, keyword = '' } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, message: "Invalid URL." });
  }

  try {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    client
      .get(url, { timeout: 10000 }, (response) => {
        let html = "";

        response.on("data", (chunk) => {
          html += chunk;
        });

        response.on("end", () => {
          const { title, description } = extractMeta(html);
          const score = scoreMeta(title, description, keyword);

          return res.json({
            success: true,
            title,
            description,
            score,
          });
        });
      })
      .on("error", (err) => {
        console.error("Title Meta fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch metadata. Please try again later.",
        });
      });
  } catch (err) {
    console.error("Title Meta process error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const metaMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
  );

  const title = titleMatch ? titleMatch[1].trim() : '';
  const description = metaMatch ? metaMatch[1].trim() : '';

  return { title, description };
}

function pixelWidth(text) {
  return text.length * 7.5;
}

function scoreMeta(title, description, keyword) {
  let score = 0;
  const titleLen = title.length;
  const descLen = description.length;
  const titlePix = pixelWidth(title);
  const descPix = pixelWidth(description);

  if (titleLen >= 40 && titleLen <= 60 && titlePix <= 580) score += 20;
  if (descLen >= 120 && descLen <= 160 && descPix <= 920) score += 20;
  if (title && keyword && title.toLowerCase().includes(keyword.toLowerCase())) score += 20;
  if (description && keyword && description.toLowerCase().includes(keyword.toLowerCase())) score += 20;
  if (title && description) score += 20;

  return score;
}


const wordCounter = async (req, res) => {
  const { text: inputText = "", url = "" } = req.body;

  let content = inputText;
  let html = "";

  // Fetch HTML if URL is given
  if (!content && url) {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      html = response.data;

      // Strip script, style, and head tags manually
      html = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");

      // Remove HTML tags to extract plain text
      content = html.replace(/<\/?[^>]+(>|$)/g, " ");
    } catch (error) {
      console.error("Error fetching URL:", error.message);
      return res.status(400).json({ success: false, message: "Failed to fetch content from URL." });
    }
  }

  // Final plain text cleanup
  content = content.replace(/\s+/g, " ").trim();

  if (!content) {
    return res.status(400).json({ success: false, message: "No valid text provided." });
  }

  // Analysis
  const charCount = content.length;
  const charCountNoSpace = content.replace(/\s/g, "").length;
  const wordCount = content.split(/\s+/).length;
  const sentenceCount = (content.match(/[\.\!\?]+(?=\s|$)/g) || []).length;

  // Calculate paragraph count *before* removing newlines
  let paragraphCount = 1;

  if (html) {
    // For HTML content
    paragraphCount = (html.match(/<p\b[^>]*>.*?<\/p>/gi) || []).length || 1;
  } else if (content) {
    const cleanedText = inputText.replace(/\r\n/g, '\n').trim();
    paragraphCount = cleanedText
      .split(/\n{2,}/) // split on 2 or more newlines
      .filter(p => p.trim().length > 0).length || 1;
  }

  // Final plain text cleanup for other metrics
  content = content.replace(/\s+/g, " ").trim();


  const avgWordsPerSentence = sentenceCount ? Math.round(wordCount / sentenceCount) : 0;
  const readingTime = Math.ceil(wordCount / 240); // avg 240 wpm

  return res.json({
    success: true,
    metrics: {
      charCount,
      charCountNoSpace,
      wordCount,
      sentenceCount,
      paragraphCount,
      avgWordsPerSentence,
      readingTime,
    },
  });
};

module.exports = { chatbotHandler, fetchRedirectChain, paragraphRewriter, sentenceRewriter, serpFetch, fetchTitleMeta, wordCounter };
