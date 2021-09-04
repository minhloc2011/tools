const dotenv = require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');

class TeleBot {
  constructor () {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.CHAT_ID
    this.bot = new TelegramBot(this.token, { polling: false });
  }
  
  sendMessage(title, messages) {
    try {
      this.bot.sendMessage(this.chatId, title + '\n\n' + messages, {
        parse_mode: 'html'
      });
    } catch (err) {
      console.err('Something went wrong when trying to send a Telegram notification', err);
    }
  }

  sendMessageWithJson (message, json) {
    try {
      this.bot.sendMessage(this.chatId, message + '\n\n<pre>' + JSON.stringify(json, null, 2) + '</pre>', {
        parse_mode: 'html'
      });
    } catch (err) {
      console.err('Something went wrong when trying to send a Telegram notification', err);
    }
  }
}

module.exports = {
  telegramBot: new TeleBot()
};
