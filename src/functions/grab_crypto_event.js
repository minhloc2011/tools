const Sheets = require("node-sheets").default;
const moment = require("moment-timezone");
const https = require("https")
const dotenv = require("dotenv").config();
const wait = require('../utils/wait')

/**
 * @param {*} event 
 * @param {*} context 
 */
exports.handler = async (event, context) => {
  try {
    const gs = new Sheets(process.env.GOOGLE_SHEET_ID);
    await gs.authorizeApiKey(process.env.GOOGLE_SHEET_KEY);
    // const names = await gs.getSheetsNames();
    // console.log('gs names', names);
    // const tables = await gs.tables(names.map((name) => ({ name: name })));
    const table = await gs.tables("1.News!A:I");
    const rows = table.rows;
    // console.log(table.headers);
    const currentTime = moment().tz(process.env.TIMEZONE);
    const eventNotEnded = rows.filter(row => {
      const eventEndTime = row.End['stringValue'];
      const eventTime = moment.utc(eventEndTime).tz(process.env.TIMEZONE);
      
      return (row.Status['stringValue'] != 'Ended') && (currentTime.format('L') == eventTime.format('L'));
    });

    if (eventNotEnded.length < 1) {
      return {
        statusCode: 200,
        body: "No events found!"
      };
    }

    const keyWrappers = ['Event', 'Type', 'Website', 'Token', 'End', 'Link'];
    for (const event of eventNotEnded) {
      let messages = '';
      messages += keyWrappers.map(key => {
        let value = event[key].stringValue;
        if (key === 'End') {
          const vstTime = moment.utc(value).tz(process.env.TIMEZONE);
          value = `${vstTime.format('LLL')} (UTC time: ${value})`;
        }
  
        return `- <b>${key}</b>: ${value}`;
      }).join('\n');
      // console.log(messages);
      sendTeleGram(messages)
      await wait(2)
    }
    
  } catch (err) {
    console.error('err', err);
    return {
      statusCode: 200,
      body: 'Failed'
    };
  }

  return {
    statusCode: 200,
    body: 'OK'
  }
}

const sendTeleGram = (messages) => {
  const title = `\uD83D\uDD25<b>REMINDER TODAY EVENT</b>\uD83D\uDD25`;
  const telePath = [
    '/bot',
    process.env.TELEGRAM_BOT_TOKEN,
    '/sendMessage?chat_id=',
    process.env.CHAT_ID,
    '&parse_mode=html&text=',
    title + '\n\n' + messages
  ];

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: encodeURI(telePath.join('')),
    method: 'GET'
  }

  const req = https.request(options, res => {
    statusCode = res.statusCode;
  });
  req.on('error', error => {
    statusCode = 500;
  })
  req.end()
}
