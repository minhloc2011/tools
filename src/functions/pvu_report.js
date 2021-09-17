var farmName = '';
var link = '';
var teleToken = '';
var chatId = '';

var avoidHoursInDay = [01, 02, 03, 04, 05]; //The hour to avoid notification
var dailyReportAt = 20; //Send daily report at 20:00 PM
var farmApiURL = 'https://backend-farm.plantvsundead.com/farms';
var farmStatusApiURL = 'https://backend-farm.plantvsundead.com/farm-status';
var myFarmURL = 'https://marketplace.plantvsundead.com/#/farm';
var timeoutRefresh;
var has = Object.prototype.hasOwnProperty;

function convertTZ(date) {
  return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));   
}

function isMyFarm() {
  var currentSite = window.location.href;
  return currentSite.includes(myFarmURL, myFarmURL + '/');
}

var currentTime = convertTZ(new Date());
var currentHour = currentTime.getHours();
console.log('isMyFarm', isMyFarm(), currentTime.toLocaleString(), currentHour);

function getBaseInfo() {
  var currentTime = convertTZ(new Date());
  var titleMessage = `\uD83C\uDF40*PlantvsUndead*\uD83C\uDF40 *${farmName}*`;
  var sendAt = `\u2139 Notify At: ${currentTime.toLocaleString()}`;
  var linkURL = `\u2139 Link URL: ${link}`;
  var baseInfo = [
    titleMessage,
    sendAt,
    linkURL
  ];

  return baseInfo.join('%0A');
}

function sendMessageTeleGram(messages) {
  var teleEndpoint = [
    'https://api.telegram.org/bot',
    teleToken,
    '/sendMessage?chat_id=',
    chatId,
    '&parse_mode=markdown&text=',
    messages
  ];

  fetch(teleEndpoint.join(''));
}

(function () {
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
     this.addEventListener('load', function () {
      getNetworkList(this)
     });
     origOpen.apply(this, arguments);
  };
})();

function getNetworkList(xhr) {
  var hasCalledFarmAPI = false;
  var hasCalledFarmStatusAPI = false;
  if (xhr.readyState == 4 && xhr.responseText && (xhr.responseURL === farmApiURL || xhr.responseURL.includes(farmApiURL + '?'))) {
    localStorage.setItem('myFarm', xhr.responseText)
    hasCalledFarmAPI = true;
  }

  if (xhr.readyState == 4 && xhr.responseText && (xhr.responseURL === farmStatusApiURL || xhr.responseURL.includes(farmStatusApiURL + '?'))) {
    localStorage.setItem('myFarmStatus', xhr.responseText)
    hasCalledFarmStatusAPI = true;
  }
}

function setTimeReloadPage(nextTimeToReload) {
  if (timeoutRefresh) {
    clearTimeout(timeoutRefresh);
  }
  console.log('Waiting for next auto reload page: ', nextTimeToReload / 1000 / 60, 'minutes');
  timeoutRefresh = setTimeout(function () {
    if (isMyFarm()) {
      window.location.reload();
      return;
    } 
    window.location.href = myFarmURL;
    return;
  }, nextTimeToReload)
}

function isFarmMaintenanceGroup(farmStatus) {
  return has.call(farmStatus, 'data') && farmStatus.data && has.call(farmStatus.data, 'currentGroup');
}

function detectFarmMaintenance(farmStatus) {
  if (isFarmMaintenanceGroup(farmStatus)) {
    const currentTime = convertTZ(farmStatus.data.currentTime);
    const nextGroup = convertTZ(farmStatus.data.nextGroup);
    let remainTime = nextGroup.getTime() - currentTime.getTime();
    const currentGroup = farmStatus.data.currentGroup;
    const yourGroup = farmStatus.data.inGroup;
    const totalGroup = farmStatus.data.totalGroup;
    let isComing = ((yourGroup > currentGroup) && ((currentGroup + 1) === yourGroup)) || 
                    ((currentGroup === totalGroup) && (yourGroup === 1));
    const randomTime = [32, 42, 55];
    const index = Math.floor(Math.random() * randomTime.length);
    let loopTime = isComing ? (remainTime + (2 * 1000 * 60)) : (1000 * 60 * randomTime[index]);

    const farmMaintenanceMsg = [
      '\u274C\u274C\u274C *Farm Maintaince Screen* \u274C\u274C\u274C',
      `\u27A1 Your Group: ${yourGroup}`,
      `\u27A1 Current Group: ${currentGroup}`,
      `\u27A1 Total Group: ${totalGroup}`,
      `\u27A1 Next Available Group: ${nextGroup.toLocaleString()}`
    ];
    
    const messages = [
      getBaseInfo(),
      farmMaintenanceMsg.join('%0A')
    ];
    sendMessageTeleGram(messages.join('%0A%0A'));
    setTimeReloadPage(loopTime);
    return;
  }
}

function detectFarm(farm) {
  var isMaintenance = isFarmMaintenanceGroup(JSON.parse(localStorage.getItem('myFarmStatus')));

  if (has.call(farm, 'data') && farm.data && !isMaintenance) {
    const farmData = farm.data;
    const totalPlants = farm.total;
    let harvests = [];
    let waters = [];
    let crows = [];
    for (const plant of farmData) {
      if (plant.totalHarvest > 0) {
        harvests.push(plant.totalHarvest);
      }
      if (has.call(plant, 'needWater') && plant.needWater) {
        waters.push(plant.needWater);
      }
      if (has.call(plant, 'hasCrow') && plant.hasCrow) {
        crows.push(plant.hasCrow);
      }
    }
    let farmStatus = [
      '\uD83C\uDD95\uD83C\uDD95\uD83C\uDD95 *Farm Current Status* \uD83C\uDD95\uD83C\uDD95\uD83C\uDD95'
    ];

    if (harvests.length > 0) {
      farmStatus.push(`\u27A1 Need Harvest \uD83D\uDCB8: ${harvests.length} plant(s) / ${totalPlants} plants`);
      const sum = harvests.reduce((a, b) => a + b, 0);
      farmStatus.push(`\u27A1 Total LE can harvest \uD83D\uDCB0: ${sum}`);
    }

    if (waters.length > 0) {
      farmStatus.push(`\u27A1 Missing Waters \uD83D\uDCA7: ${waters.length} plant(s) / ${totalPlants} plants`);
    }

    if (crows.length > 0) {
      farmStatus.push(`\u27A1 Has Crows \uD83D\uDE08: ${crows.length} plant(s) / ${totalPlants} plants`);
    }

    if (farmStatus.length > 1) {
      var messages = [
        getBaseInfo(),
        farmStatus.join('%0A')
      ];
      sendMessageTeleGram(messages.join('%0A%0A'));
    }
    setTimeReloadPage(1000 * 60 * 15);
    return;
  }
}

function dailyFarmReport() {
  var myFarm = localStorage.getItem('myFarm');
  if (myFarm) {
    var myFarmJson = JSON.parse(myFarm);
    if (has.call(myFarmJson, 'data') && myFarmJson.data) {
      const farmData = myFarmJson.data;
      let farmReport = [
        '\u23F0\u23F0\u23F0 *Today Reports* \u23F0\u23F0\u23F0'
      ];

      for (const [i, plant] of farmData.entries()) {
        const water = plant.activeTools.filter(tool => tool.type === 'WATER')[0];
        let emptyWater = convertTZ(water.endTime);
        let harvest = convertTZ(plant.harvestTime);
        let num = i + 1;
        farmReport.push(`\uD83C\uDF31\uD83C\uDF31 *Plant ${num}* \uD83C\uDF31\uD83C\uDF31`);
        farmReport.push(`\u27A1 Empty water at: ${emptyWater.toLocaleString()}`);
        farmReport.push(`\u27A1 Harvest LE at: ${harvest.toLocaleString()}`);
      }

      var messages = [
        getBaseInfo(),
        farmReport.join('%0A')
      ];
      sendMessageTeleGram(messages.join('%0A%0A'));
      return;
    }
  }
  var messages = [
    getBaseInfo(),
    '\uD83C\uDD98\uD83C\uDD98 Get failed today report from our farm, please check.'
  ];
  sendMessageTeleGram(messages.join('%0A%0A'));
}

if (!calledFunc) {
  var calledFunc = 'called';
  var currentTime = convertTZ(new Date());
  var currentHour = currentTime.getHours();
  var isSkipAlert = avoidHoursInDay.includes(currentHour);

  if (isSkipAlert) {
    localStorage.setItem('hasTodayReport', 'no');
    setTimeReloadPage(1000 * 60 * 60);//1 hours
    calledFunc = null;
  }

  if (calledFunc) {
    var hasTodayReported = localStorage.getItem('hasTodayReport');
    if (currentHour === dailyReportAt && 
      ((hasTodayReported && hasTodayReported === 'no') || !hasTodayReported)) {
      dailyFarmReport();
      localStorage.setItem('hasTodayReport', 'yes');
    }
  
    if (isMyFarm()) {
      window.onload = () => {
        setTimeout(function () {
          var myFarmStatus = localStorage.getItem('myFarmStatus');
          var myFarm = localStorage.getItem('myFarm');
  
          if (myFarmStatus) {
            myFarmStatusJson = JSON.parse(myFarmStatus);
            detectFarmMaintenance(myFarmStatusJson);
          }
  
          if (myFarm) {
            myFarmJson = JSON.parse(myFarm);
            detectFarm(myFarmJson);
          }
        }, 15 * 1000);
      }
    }
  }
}
