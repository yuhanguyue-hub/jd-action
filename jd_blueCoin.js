/*
京小超兑换奖品脚本
感谢@yangtingxiao提供
更新时间：2020-10-21
支持京东多个账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
// quantumultx
[task_local]
#京小超领蓝币
0 0 0 * * * https://raw.githubusercontent.com/lxk0301/scripts/master/jd_blueCoin.js, tag=京小超领蓝币, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxc.png, enabled=true
// Loon
[Script]
cron "0 0 0 * * *" script-path=https://raw.githubusercontent.com/lxk0301/scripts/master/jd_blueCoin.js,tag=京小超领蓝币
// Surge
京小超领蓝币 = type=cron,cronexp="0 0 0 * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/lxk0301/scripts/master/jd_blueCoin.js
 */
const $ = new Env('京小超兑换奖品');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let coinToBeans = $.getdata('coinToBeans') * 1 || 20; //兑换多少数量的京豆（1-20之间，或者1000），0默认兑换不兑换，如需兑换把0改成1-20之间的数字或者1000即可
let jdNotify = false;//是否开启静默运行，默认false关闭(即:奖品兑换成功后会发出通知提示)
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr.push($.getdata('CookieJD'));
  cookiesArr.push($.getdata('CookieJD2'));
}
let UserName = '';
const awardPrizeList = ['免洗凝胶', '酒精喷雾', '柠檬果香洗手液'];
const JD_API_HOST = `https://api.m.jd.com/api?appid=jdsupermarket`;
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
    return;
  }
  for (let i =0; i < cookiesArr.length; i++) {
    cookie = cookiesArr[i];
    if (cookie) {
      UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      $.data = {};
      $.coincount = 0;
      $.beanscount = 0;
      $.blueCost = 0;
      $.coinerr = "";
      $.beanerr = "";
      $.title = '';
      //console.log($.coincount);
      console.log(`\n===========开始【京东账号${$.index}】${UserName}==============\n`);
      //先兑换京豆
      if ($.isNode()) {
        if (process.env.MARKET_COIN_TO_BEANS) {
          if ((process.env.MARKET_COIN_TO_BEANS * 1 >= 0 && process.env.MARKET_COIN_TO_BEANS * 1 <=20) || process.env.MARKET_COIN_TO_BEANS * 1 === 1000) {
            coinToBeans = process.env.MARKET_COIN_TO_BEANS ? process.env.MARKET_COIN_TO_BEANS * 1 : coinToBeans;
          } else {
            console.log(`您输入的MARKET_COIN_T0_BEANS为非法数字，请重新填写`);
          }
        }
      }
      if (coinToBeans) {
        await smtgHome();
        await smtg_queryPrize();
      } else {
        console.log('查询到您设置的是不兑换京豆选项，现在为您跳过兑换京豆。如需兑换，请去BoxJs设置或者修改脚本coinToBeans\n')
      }
      if ($.queryPrizeData && $.queryPrizeData.data.bizCode === 300) {
        $.msg($.name, `【提示】京东账号${$.index}${UserName} cookie已过期！请先获取cookie\n直接使用NobyDa的京东签到获取`, 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效`, `京东账号${$.index} ${UserName}\n请重新登录获取cookie`);
        }
        continue;
      }
      //再收取蓝币
      // await smtg_receiveCoin();
      // if ($.data.data.bizCode === 300)
      // {
      //   $.msg($.name, `【提示】京东账号${$.index}${UserName} cookie已过期！请先获取cookie\n直接使用NobyDa的京东签到获取`, 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
      //   if ($.isNode()) {
      //     await notify.sendNotify(`${$.name}cookie已失效`, `京东账号${$.index} ${UserName}\n请重新登录获取cookie`);
      //   }
      //   if ($.index === 1) {
      //     $.setdata('', 'CookieJD');//cookie失效，故清空cookie。
      //   } else if ($.index === 2){
      //     $.setdata('', 'CookieJD2');//cookie失效，故清空cookie。
      //   }
      //   continue;
      // }
      await msgShow();
    }
  }
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done())


//领蓝币
let index = 0;
function smtg_receiveCoin(timeout = 0) {
  return new Promise((resolve) => {
    setTimeout( ()=>{
    let url = {
      url : `${JD_API_HOST}&functionId=smtg_receiveCoin&clientVersion=8.0.0&client=m&body=%7B%22type%22:2%7D&t=${Date.now()}`,
      headers : {
        'Origin' : `https://jdsupermarket.jd.com`,
        'Cookie' : cookie,
        'Connection' : `keep-alive`,
        'Accept' : `application/json, text/plain, */*`,
        'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
        'Host' : `api.m.jd.com`,
        'Accept-Encoding' : `gzip, deflate, br`,
        'Accept-Language' : `zh-cn`
      }
    }
    $.get(url, async (err, resp, data) => {
      try {
        data = JSON.parse(data);
        $.data = data;
        if ($.data.data.bizCode !== 0 && $.data.data.bizCode !== 809) {
          $.coinerr = `${$.data.data.bizMsg}`;
          // console.log(`【京东账号${$.index}】${UserName} 收取蓝币失败：${$.data.data.bizMsg}`)
          return
        }
        if  ($.data.data.bizCode === 0) {
          $.coincount += $.data.data.result.receivedBlue;
          index ++;
          console.log(`【京东账号${$.index}】${UserName} 第${index}次领蓝币成功，获得${$.data.data.result.receivedBlue}个\n`)
          if (!$.data.data.result.isNextReceived) return;
        }
        await  smtg_receiveCoin(3000);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve()
      }
    })
    },timeout)
  })
}
//查询任务
function smtg_queryPrize(timeout = 0){
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `${JD_API_HOST}&functionId=smtg_queryPrize&clientVersion=8.0.0&client=m&body=%7B%7D&t=${Date.now()}`,
        headers : {
          'Origin' : `https://jdsupermarket.jd.com`,
          'Cookie' : cookie,
          'Connection' : `keep-alive`,
          'Accept' : `application/json, text/plain, */*`,
          'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
          'Host' : `api.m.jd.com`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `zh-cn`
        }
      }
      $.post(url, async (err, resp, data) => {
        try {
          data = JSON.parse(data);
          $.queryPrizeData = data;
          if (data.data.bizCode !== 0) {
            $.beanerr = `${data.data.bizMsg}`;
            return
          }
          if (data.data.bizCode === 0) {
            const { prizeList } = data.data.result;
            if (coinToBeans === 1000) {
              if (prizeList[1].beanType === 'BeanPackage') {
                console.log(`查询换${prizeList[1].title}ID成功，ID:${prizeList[1].prizeId}`)
                $.title = prizeList[1].title;
                $.blueCost = prizeList[1].blueCost;
              } else {
                console.log(`查询换1000京豆ID失败`)
                $.beanerr = `东哥今天不给换`;
                return ;
              }
              if (prizeList[1].inStock === 506) {
                $.beanerr = `失败，1000京豆领光了，请明天再来`;
                return ;
              }
              if (prizeList[1].targetNum === prizeList[1].finishNum) {
                $.beanerr = `${prizeList[1].subTitle}`;
                return ;
              }
              //兑换1000京豆
              if ($.totalBlue > $.blueCost) {
                await smtg_obtainPrize(prizeList[1].prizeId);
              } else {
                console.log(`兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`);
                $.beanerr = `兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`;
              }
            } else if (coinToBeans > 0 && coinToBeans <= 20) {
              if (prizeList[0].beanType === 'Bean') {
                console.log(`查询换${prizeList[0].title}ID成功，ID:${prizeList[0].prizeId}`)
                $.title = prizeList[0].title;
                $.blueCost = prizeList[0].blueCost;
              } else {
                console.log(`查询换万能的京豆ID失败`)
                $.beanerr = `东哥今天不给换`;
                return ;
              }
              if (prizeList[0].inStock === 506) {
                console.log(`失败，万能的京豆领光了，请明天再来`);
                $.beanerr = `失败，万能的京豆领光了，请明天再来`;
                return ;
              }
              if (prizeList[0].targetNum === prizeList[0].finishNum) {
                $.beanerr = `${prizeList[0].subTitle}`;
                return ;
              }
              //兑换万能的京豆(1-20京豆)
              if ($.totalBlue > $.blueCost) {
                await smtg_obtainPrize(prizeList[0].prizeId,1000);
              } else {
                console.log(`兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`);
                $.beanerr = `兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`;
              }
            } else if (coinToBeans === 2801390972) {
              //兑换 巧白酒精喷雾
              let prizeId = '', i;
              for (let index = 0; index < prizeList.length; index ++) {
                if (prizeList[index].title === awardPrizeList[0]) {
                  prizeId = prizeList[index].prizeId;
                  i = index;
                  $.title = prizeList[index].title;
                  $.blueCost = prizeList[index].blueCost;
                }
              }
              if (prizeId) {
                if (prizeList[i].inStock === 506) {
                  console.log(`失败，${awardPrizeList[0]}领光了，请明天再来`);
                  $.beanerr = `失败，${awardPrizeList[0]}领光了，请明天再来`;
                  return ;
                }
                if (prizeList[i].targetNum === prizeList[i].finishNum) {
                  $.beanerr = `${prizeList[0].subTitle}`;
                  return ;
                }
                if ($.totalBlue > $.blueCost) {
                  await smtg_obtainPrize(prizeId);
                } else {
                  console.log(`兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`);
                  $.beanerr = `兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`;
                }
              } else {
                console.log(`奖品兑换列表[${awardPrizeList[0]}]已下架`);
                $.beanerr = `奖品兑换列表[${awardPrizeList[0]}]已下架`;
              }
            } else if (coinToBeans === 2801390982) {
              //兑换 巧白西柚洗手液
              let prizeId = '', i;
              for (let index = 0; index < prizeList.length; index ++) {
                if (prizeList[index].title === awardPrizeList[1]) {
                  prizeId = prizeList[index].prizeId;
                  i = index;
                  $.title = prizeList[index].title;
                  $.blueCost = prizeList[index].blueCost;
                }
              }
              if (prizeId) {
                if (prizeList[i].inStock === 506) {
                  console.log(`失败，${awardPrizeList[1]}领光了，请明天再来`);
                  $.beanerr = `失败，${awardPrizeList[1]}领光了，请明天再来`;
                  return ;
                }
                if (prizeList[i].targetNum === prizeList[i].finishNum) {
                  $.beanerr = `${prizeList[0].subTitle}`;
                  return ;
                }
                if ($.totalBlue > $.blueCost) {
                  await smtg_obtainPrize(prizeId);
                } else {
                  console.log(`兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`);
                  $.beanerr = `兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`;
                }
              } else {
                console.log(`奖品兑换列表[${awardPrizeList[1]}]已下架`);
                $.beanerr = `奖品兑换列表[${awardPrizeList[1]}]已下架`;
              }
            } else if (coinToBeans === 2801390984) {
              //兑换 雏菊洗衣凝珠
              let prizeId = '', i;
              for (let index = 0; index < prizeList.length; index ++) {
                if (prizeList[index].title === awardPrizeList[2]) {
                  prizeId = prizeList[index].prizeId;
                  i = index;
                  $.title = prizeList[index].title;
                  $.blueCost = prizeList[index].blueCost;
                }
              }
              if (prizeId) {
                if (prizeList[i].inStock === 506) {
                  console.log(`失败，${awardPrizeList[2]}领光了，请明天再来`);
                  $.beanerr = `失败，${awardPrizeList[2]}领光了，请明天再来`;
                  return ;
                }
                if (prizeList[i].targetNum === prizeList[i].finishNum) {
                  $.beanerr = `${prizeList[0].subTitle}`;
                  return ;
                }
                if ($.totalBlue > $.blueCost) {
                  await smtg_obtainPrize(prizeId);
                } else {
                  console.log(`兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`);
                  $.beanerr = `兑换失败,您目前蓝币${$.totalBlue}个,不足以兑换${$.title}所需的${$.blueCost}个`;
                }
              } else {
                console.log(`奖品兑换列表[${awardPrizeList[2]}]已下架`);
                $.beanerr = `奖品兑换列表[${awardPrizeList[2]}]已下架`;
              }
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}
//换京豆
function smtg_obtainPrize(prizeId, timeout = 0) {
  //1000京豆，prizeId为4401379726
  return new Promise((resolve) => {
    setTimeout( ()=>{
      let url = {
        url : `${JD_API_HOST}&functionId=smtg_obtainPrize&clientVersion=8.0.0&client=m&body=%7B%22prizeId%22:%22${prizeId}%22%7D&t=${Date.now()}`,
        headers : {
          'Origin' : `https://jdsupermarket.jd.com`,
          'Cookie' : cookie,
          'Connection' : `keep-alive`,
          'Accept' : `application/json, text/plain, */*`,
          'Referer' : `https://jdsupermarket.jd.com/game/?tt=1597540727225`,
          'Host' : `api.m.jd.com`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `zh-cn`
        }
      }
      $.post(url, async (err, resp, data) => {
        try {
          console.log(`兑换结果:${data}`);
          data = JSON.parse(data);
          $.data = data;
          if ($.data.data.bizCode !== 0) {
            $.beanerr = `${$.data.data.bizMsg}`;
            //console.log(`【京东账号${$.index}】${UserName} 换取京豆失败：${$.data.data.bizMsg}`)
            return
          }
          if ($.data.data.bizCode === 0) {
            if (coinToBeans === 1000) {
              $.beanscount ++;
              console.log(`【京东账号${$.index}】${UserName} 第${$.data.data.result.exchangeNum}次换${$.title}成功`)
              if ($.beanscount === 1) return;
            } else if (coinToBeans > 0 && coinToBeans <= 20) {
              $.beanscount ++;
              console.log(`【京东账号${$.index}】${UserName} 第${$.data.data.result.exchangeNum}次换${$.title}成功`)
              if ($.data.data.result.exchangeNum === 20 || $.beanscount === coinToBeans || $.data.data.result.blue < 500) return;
            } else if (coinToBeans === 2801390972) {
              //兑换巧白酒精喷雾
              $.beanscount ++;
              console.log(`【京东账号${$.index}】${UserName} 第${$.data.data.result.exchangeNum}次换${$.title}成功`)
              if ($.beanscount === 1) return;
            } else if (coinToBeans === 2801390982) {
              //兑换巧白西柚洗手液
              $.beanscount ++;
              console.log(`【京东账号${$.index}】${UserName} 第${$.data.data.result.exchangeNum}次换${$.title}成功`)
              if ($.beanscount === 1) return;
            } else if (coinToBeans === 2801390984) {
              //兑换雏菊洗衣凝珠
              $.beanscount ++;
              console.log(`【京东账号${$.index}】${UserName} 第${$.data.data.result.exchangeNum}次换${$.title}成功`)
              if ($.beanscount === 1) return;
            }
          }
          await  smtg_obtainPrize(prizeId,3000);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}
function smtgHome() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_home'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京小超兑换奖品: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
          if (data.data.bizCode === 0) {
            const { result } = data.data;
            $.totalGold = result.totalGold;
            $.totalBlue = result.totalBlue;
            console.log(`【总金币】${$.totalGold}个\n`);
            console.log(`【总蓝币】${$.totalBlue}个\n`);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}

//通知
async function msgShow() {
  // $.msg($.name, ``, `【京东账号${$.index}】${UserName}\n【收取蓝币】${$.coincount ? `${$.coincount}个` : $.coinerr }${coinToBeans ? `\n【兑换京豆】${ $.beanscount ? `${$.beanscount}个` : $.beanerr}` : ""}`);
  $.log(`\n【京东账号${$.index}】${UserName}\n${coinToBeans ? `【兑换${$.title}】${$.beanscount ? `成功` : $.beanerr}` : "您设置的是不兑换奖品"}\n`);
  let ctrTemp;
  if ($.isNode() && process.env.jdSuperMarketRewardNotify) {
    ctrTemp = `${process.env.jdSuperMarketRewardNotify}` === 'false';
  } else if ($.getdata('jdSuperMarketRewardNotify')) {
    ctrTemp = $.getdata('jdSuperMarketRewardNotify') === 'false';
  } else {
    ctrTemp = `${jdNotify}` === 'false';
  }
  //默认只在兑换奖品成功后弹窗提醒。情况情况加，只打印日志，不弹窗
  if ($.beanscount && ctrTemp) {
    $.msg($.name, ``, `【京东账号${$.index}】${UserName}\n${coinToBeans ? `【兑换${$.title}】${ $.beanscount ? `成功，数量：${$.beanscount}个` : $.beanerr}` : "您设置的是不兑换奖品"}`);
    if ($.isNode()) {
      await notify.sendNotify($.name, `【京东账号${$.index}】${UserName}\n${coinToBeans ? `【兑换${$.title}】${$.beanscount ? `成功，数量：${$.beanscount}个` : $.beanerr}` : "您设置的是不兑换奖品"}`)
    }
  }
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}&functionId=${function_id}&clientVersion=8.0.0&client=m&body=${escape(JSON.stringify(body))}&t=${Date.now()}`,
    headers: {
      'User-Agent': 'jdapp;iPhone;9.0.8;13.6;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
      'Host': 'api.m.jd.com',
      'Cookie': cookie,
      'Referer': 'https://jdsupermarket.jd.com/game',
      'Origin': 'https://jdsupermarket.jd.com',
    }
  }
}

function Env(t,s){return new class{constructor(t,s){this.name=t,this.data=null,this.dataFile="box.dat",this.logs=[],this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}getScript(t){return new Promise(s=>{$.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=s&&s.timeout?s.timeout:o;const[h,a]=i.split("@"),r={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":h,Accept:"*/*"}};$.post(r,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),o=JSON.stringify(this.data);e?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(s,o):this.fs.writeFileSync(t,o)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return e;return o}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),o=e?this.getval(e):"";if(o)try{const t=JSON.parse(o);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(s),h=this.getval(i),a=i?"null"===h?null:h||"{}":"{}";try{const s=JSON.parse(a);this.lodash_set(s,o,t),e=this.setval(JSON.stringify(s),i)}catch(s){const h={};this.lodash_set(h,o,t),e=this.setval(JSON.stringify(h),i)}}else e=$.setval(t,s);return e}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isLoon()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)}):this.isQuanX()?$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)))}post(t,s=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),delete t.headers["Content-Length"],this.isSurge()||this.isLoon())$httpClient.post(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)});else if(this.isQuanX())t.method="POST",$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t));else if(this.isNode()){this.initGotEnv(t);const{url:e,...i}=t;this.got.post(e,i).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t))}}time(t){let s={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in s)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?s[e]:("00"+s[e]).substr((""+s[e]).length)));return t}msg(s=t,e="",i="",o){const h=t=>!t||!this.isLoon()&&this.isSurge()?t:"string"==typeof t?this.isLoon()?t:this.isQuanX()?{"open-url":t}:void 0:"object"==typeof t&&(t["open-url"]||t["media-url"])?this.isLoon()?t["open-url"]:this.isQuanX()?t:void 0:void 0;this.isSurge()||this.isLoon()?$notification.post(s,e,i,h(o)):this.isQuanX()&&$notify(s,e,i,h(o)),this.logs.push("","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="),this.logs.push(s),e&&this.logs.push(e),i&&this.logs.push(i)}log(...t){t.length>0?this.logs=[...this.logs,...t]:console.log(this.logs.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();e?$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,s)}
