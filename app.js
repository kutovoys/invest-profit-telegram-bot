const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const mongo = require('mongodb').MongoClient
const config = require('config')
const fetch = require('node-fetch')
const { Markup } = require('telegraf/extra')
const bot = new Telegraf(config.get('token'))

let menuMarkup = [['/portfolio'], ['/buy', '/sell']]

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
  }
)

bot.start((ctx) => {
  console.log('Id пользователя:', ctx.from.id)
  return ctx.reply(
    'Добро пожаловать!',
    Extra.markup(Markup.keyboard(menuMarkup).resize())
  )
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
      percentNow = Math.abs(100 - tickerSummNow / (tickerSumm / 100))

      if (tickerSummNow < tickerSumm) {
        trend = '📉  -'
      } else if (tickerSummNow > tickerSumm) {
        trend = '📈  +'
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
      MESSAGE += loopMessage
    }
    let priceRub = await getPrice('RUB=X')
    let portfolioSummRub = portfolioSumm * priceRub
    let portfolioSummNowRub = portfolioSummNow * priceRub
    let profitRub = Math.abs(portfolioSummRub - portfolioSummNowRub)
    let profitUsd = Math.abs(portfolioSummNow - portfolioSumm)
    totalPercentNow = Math.abs(100 - portfolioSummNow / (portfolioSumm / 100))
    if (portfolioSumm > portfolioSummNow) {
      sticker = '🤦‍♂️  -'
      totalTrend = '📉  -'
    } else if (portfolioSumm < portfolioSummNow) {
      sticker = '💰  +'
      totalTrend = '📈  +'
    } else {
      sticker = '⚖️  '
      totalTrend = '⚖️'
    }
    MESSAGE =
      MESSAGE +
      '💼 *Весь портфель:*  ' +
      totalTrend +
      totalPercentNow.toFixed(2) +
      '%\n' +
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
    return ctx.reply(
      MESSAGE,
      Extra.markdown().markup(Markup.keyboard(menuMarkup).resize())
    )
  }
})

bot.command('buy', async (ctx) => {
  let buyMessage = ctx.message.text.split(/\s+/)
  let ticker = buyMessage[1]
  let count = Number(buyMessage[2])
  let price = Number(buyMessage[3])
  if (buyMessage[4] != undefined) {
    transactionDate = buyMessage[4]
  } else {
    transactionDate = new Date().toLocaleDateString('ru')
  }
  let tickerSumm = count * price
  nowPrice = await getPrice(ticker)
  let dbData = await db
    .collection(String(ctx.from.id))
    .findOne({ name: ticker })
  if (dbData !== null && nowPrice !== undefined) {
    newValues = {
      $set: {
        full_count: dbData.full_count + count,
        full_price: dbData.full_price + tickerSumm,
      },
      $push: {
        transactions: {
          operation: 'buy',
          date: transactionDate,
          ticker_name: ticker,
          trans_count: count,
          trans_price: price,
        },
      },
    }
    await db
      .collection(String(ctx.from.id))
      .updateOne({ name: ticker }, newValues)
    ctx.reply(
      `Покупка тикера ${ticker} в количестве ${count} по цене: ${price}. Сумма покупки: ${tickerSumm}`
    )
  } else if (dbData === null && nowPrice !== undefined) {
    await db.collection(String(ctx.from.id)).insertOne({
      name: ticker,
      full_count: count,
      full_price: tickerSumm,
      transactions: [
        {
          operation: 'buy',
          date: transactionDate,
          ticker_name: ticker,
          trans_count: count,
          trans_price: price,
        },
      ],
    })
    ctx.reply(
      `Покупка тикера ${ticker} в количестве ${count} по цене: ${price}. Сумма покупки: ${tickerSumm}`
    )
  } else {
    ctx.reply(`Не могу найти тикер ${ticker}. Проверьте написание.`)
  }
})

bot.command('sell', async (ctx) => {
  let buyMessage = ctx.message.text.split(/\s+/)
  let ticker = buyMessage[1]
  let count = Number(buyMessage[2])
  let price = Number(buyMessage[3])
  if (buyMessage[4] != undefined) {
    transactionDate = buyMessage[4]
  } else {
    transactionDate = new Date().toLocaleDateString('ru')
  }
  let tickerSumm = count * price
  nowPrice = await getPrice(ticker)
  let dbData = await db
    .collection(String(ctx.from.id))
    .findOne({ name: ticker })
  if (dbData !== null && nowPrice !== undefined) {
    newValues = {
      $set: {
        full_count: dbData.full_count - count,
        full_price: dbData.full_price - tickerSumm,
      },
      $push: {
        transactions: {
          operation: 'sell',
          date: transactionDate,
          ticker_name: ticker,
          trans_count: count,
          trans_price: price,
        },
      },
    }
    await db
      .collection(String(ctx.from.id))
      .updateOne({ name: ticker }, newValues)
    ctx.reply(
      `Продажа тикера ${ticker} в количестве ${count} по цене: ${price}. Сумма продажи: ${tickerSumm}`
    )
  } else if (dbData === null && nowPrice !== undefined) {
    ctx.reply(
      `Вы не можете продать ${ticker}. Данного тикера нет в вашем портфеле`
    )
  } else {
    ctx.reply(`Не могу найти тикер ${ticker}. Проверьте написание.`)
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
    console.log('Ошибка в getPrice')
  }
}
