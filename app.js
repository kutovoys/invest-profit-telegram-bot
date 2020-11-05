const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const mongo = require('mongodb').MongoClient
const config = require('config')
const fetch = require('node-fetch')
const bot = new Telegraf(config.get('token'))

mongo.connect(
  config.get('mongoUri'),
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log(err)
    }

    db = client.db('tgbot')
    bot.launch()
    console.log('Bot started...')
    // bot.startPolling()
  }
)

bot.start((ctx) => {
  console.log('Id пользователя:', ctx.from.id)
  return ctx.reply('Добро пожаловать!')
})

bot.command('portfolio', async (ctx) => {
  let dbData = await db
    .collection(String(ctx.from.id))
    .find({}, { projection: { _id: 0, name: 1, full_count: 1, full_price: 1 } })
    .toArray()
  if (dbData.length === 0) {
    ctx.reply('Ваш портфель пуст.')
  } else {
    let MESSAGE = '*Ваш портфель:*\n\n'
    let portfolioSumm = 0
    let portfolioSummNow = 0
    for (let index in dbData) {
      let ticker = dbData[index].name
      let tickerCount = dbData[index].full_count
      let tickerSumm = dbData[index].full_price
      let tickerPrice = await getPrice(ticker)
      let tickerSummNow = tickerCount * tickerPrice
      portfolioSumm += tickerSumm
      portfolioSummNow += tickerSummNow

      if (tickerSummNow < tickerSumm) {
        trend = '📉  -'
        percentNow = Math.abs(100 - tickerSummNow / (tickerSumm / 100))
        sticker = '🤦‍♂️  -'
      } else if (tickerSummNow > tickerSumm) {
        trend = '📈  +'
        percentNow = Math.abs(100 - tickerSummNow / (tickerSumm / 100))
        sticker = '💰 +'
      } else {
        trend = '⚖️'
        percentNow = ''
      }

      let loopMessage =
        '*' +
        ticker +
        '*   (' +
        tickerCount +
        ')   ' +
        trend +
        percentNow.toFixed(2) +
        '%\n' +
        tickerSumm.toFixed(2) +
        '$   ➡️   ' +
        tickerSummNow.toFixed(2) +
        '$\n\n'
      console.log(loopMessage)
      MESSAGE += loopMessage
      console.log(MESSAGE)
    }
    let priceRub = await getPrice('RUB=X')
    let portfolioSummRub = portfolioSumm * priceRub
    let portfolioSummNowRub = portfolioSummNow * priceRub
    let profitRub = Math.abs(portfolioSummRub - portfolioSummNowRub)
    let profitUsd = Math.abs(portfolioSummNow - portfolioSumm)
    MESSAGE =
      MESSAGE +
      '💼 *Весь портфель:*\n' +
      portfolioSumm.toFixed(2) +
      '$   ➡️   ' +
      portfolioSummNow.toFixed(2) +
      '$   ' +
      sticker +
      profitUsd.toFixed(2) +
      '$\n' +
      portfolioSummRub.toFixed(0) +
      '₽   ➡️   ' +
      portfolioSummNowRub.toFixed(0) +
      '₽   ' +
      sticker +
      profitRub.toFixed(0) +
      '₽\n'
    console.log(MESSAGE)
    return ctx.reply(MESSAGE, Extra.markdown())
  }
})

async function getPrice(ID) {
  //получаем имя бумаги
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=price`
  try {
    const response = await fetch(url)
    const json = await response.json()
    const value = json.quoteSummary.result[0].price.regularMarketPrice.raw
    return value
  } catch (e) {
    console.log('Ошибка в USAStockGetPrice')
  }
}
