const async = require('async');
var connection = require('../../config/connection');
var dateFormat = require('dateformat');
const axios = require('axios');

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
  const apiKey = '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';

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

module.exports = { chatbotHandler };
