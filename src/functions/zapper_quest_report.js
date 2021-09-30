const Sheets = require("node-sheets").default
const moment = require("moment-timezone")
const https = require("https")
const dotenv = require("dotenv").config()
const wait = require('../utils/wait')
const has = Object.prototype.hasOwnProperty

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
    const table = await gs.tables("5.ZapperQuests!A:D");
    const rows = table.rows;
    const validRows = rows.filter(row => {
      return (row.Wallet['stringValue'] && row.ApiKey['stringValue']);
    });
    if (validRows.length < 1) {
      return {statusCode: 200};
    }
    const currentTime = moment().tz(process.env.TIMEZONE);
    for (const row of validRows) {
      let res = await requestQuests(row.Wallet['stringValue'], row.ApiKey['stringValue'])
      if (has.call(res, 'statusCode') && res.statusCode !== 200) continue

      let messages = `\uD83D\uDE80 Wallet Address: ${row.Wallet['stringValue']} \n`;
      messages += '\uD83D\uDE80 Website: https://zapper.fi/quests \n\n';
      messages += res['data'].map(item => {
        if (item.id == 9) {
          return `\u2705 <b>${item.name}</b>: Waiting...`;
        }
        const completableAt = moment.utc(item.isCompletableAt).tz(process.env.TIMEZONE);
        if (currentTime.diff(completableAt) >= 0) {
          return `\u2705 <b>${item.name}</b> is over time, let's claim now \u23F0`;
        }
        const duration = formatRemainTime(completableAt.valueOf() - currentTime.valueOf());

        return `\u2705 <b>${item.name}</b>: ${duration} \u23F0`;
      }).join('\n');
      await sendTeleGram(messages)
      await wait(2);
    }
    
    return {
      statusCode: 200,
      body: 'OK'
    };
  } catch (err) {
    console.error(err);
    return {statusCode: 500};
  } 
}

const formatRemainTime = (timestamp) => {
  let delta = Math.abs(timestamp) / 1000;
  // calculate (and subtract) whole days
  let days = Math.floor(delta / 86400);
  delta -= days * 86400;
  // calculate (and subtract) whole hours
  let hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;
  // calculate (and subtract) whole minutes
  let minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;
  // what's left is seconds
  // var seconds = delta % 60;
  hours = hours.toString().padStart(2, '0');
  minutes = minutes.toString().padStart(2, '0');
  if (days === 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${days}d ${hours}h ${minutes}m`;
}

const requestQuests = async (walletAddress, apiKey) => {
  const path = [
    '/v1/gamification/users/',
    walletAddress,
    '/available-quests?',
    'api_key=' + apiKey
  ];
  const options = {
    hostname: 'api.zapper.fi',
    port: 443,
    path: encodeURI(path.join('')),
    method: 'GET'
  }

  return new Promise((resolve, reject) => {
    let req = https.request(options, (res) => {
      let output = '';
      res.setEncoding('utf8');

      res.on('data', function (chunk) {
          output += chunk;
      });

      res.on('end', () => {
          try {
              let obj = JSON.parse(output);
              resolve({
                  statusCode: res.statusCode,
                  data: obj
              });
          } catch (err) {
              console.error('rest::end', err);
              reject(err);
          }
        });
    });

    req.on('error', (err) => {
        console.error('rest::request', err);
        reject(err);
    });

    req.end();
  });
}

const sendTeleGram = async (messages) => {
  const title = `\u231B<b>Zapper Quests</b>\u231B at ${moment().tz(process.env.TIMEZONE).format('Y/m/d HH:mm:ss')}`;
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

  return new Promise((resolve, reject) => {
    let req = https.request(options, (res) => {
    });

    req.on('error', (err) => {
      console.error('rest::request', err);
      reject(err);
    });

    req.end();
  });
}
