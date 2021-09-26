const HCCrawler = require('headless-chrome-crawler');

/**
 * @param {*} event 
 * @param {*} context 
 * @returns 
 */
exports.handler = async (event, context) => {
  let report = {};
  let statusCode;
  try {
    const crawler = await HCCrawler.launch({
      evaluatePage: (() => {
        const json = [];
        $("table > tbody > tr").each((index, element) => {
          const useGreenHouse = $(element).find('td:nth-of-type(5)').find('img').attr('src');
          json.push({
            'plantType': $(element).find('td:nth-of-type(1)').find('span.plant-type-text').text().trim(),
            'useGreenHouse': useGreenHouse == 'assets/images/useGreenhouse.png' ? true : false
          })
        });
  
        return json;
      }),
      onSuccess: (result => {
        report['data'] = result;
      }),
    });
    // Queue a request
    await crawler.queue('https://pvuextratools.com');
    await crawler.onIdle(); // Resolved when no queue is left
    await crawler.close();

    report['data']['request'] = 'success'
    statusCode = 200;
    // console.log('result is: ', JSON.stringify(report['data']['result'], null, 4))
  } catch (err) {
    report['data']['request'] = 'error'
    statusCode = 500;
    console.error('err', err);
  }

  return {
    statusCode: statusCode,
    body: report['data']
  }
}
