const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const mongo = require('mongodb').MongoClient
const config = require('config')
const fetch = require('node-fetch')
const Markup = require('telegraf/markup')
const bot = new Telegraf(config.get('token'))

const mainMenu = [['/stonks', '/crypto'], ['/all']]
const inlineMenu = Markup.inlineKeyboard([
  Markup.callbackButton('$', 'dollar'),
  Markup.callbackButton('₽', 'ruble'),
  Markup.callbackButton('Buy', 'buy'),
  Markup.callbackButton('Sell', 'sell'),
])

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
    'Добро пожаловать!\nВыберите тип активов.',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
})

bot.command('stonks', async (ctx) => {
  ctx.reply(await makeMessage(ctx.from.id), Extra.markdown().markup(inlineMenu))
})

bot.command('crypto', async (ctx) => {
  ctx.reply(
    'Ваша крипта: Тут в будущем будет ваш портфель',
    Extra.markdown().markup(inlineMenu)
  )
})

bot.action('dollar', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText(
    await makeMessage(ctx.from.id, '$'),
    Extra.markdown().markup(inlineMenu)
  )
})
bot.action('ruble', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText(
    await makeMessage(ctx.from.id, '₽'),
    Extra.markdown().markup(inlineMenu)
  )
})

//
async function makeMessage(chatId, currency = '$') {
  let dbData = await db
    .collection(String(chatId))
    .find({}, { projection: { _id: 0, name: 1, full_count: 1, full_price: 1 } })
    .sort({ name: 1 })
    .toArray()
  tickerArray = dbData.map((a) => a.name)

  if (dbData.length === 0) {
    MESSAGE = 'Ваш портфель пуст.'
  } else {
    let MESSAGE = '*Ваш портфель:*\n\n'
    let portfolioSumm = 0
    let portfolioSummNow = 0
    let tickersPrice = await getBatchPrice(tickerArray)
    if (currency === '₽') {
      priceRub = await getPrice('RUB=X')
    } else {
      priceRub = 1
    }
    for (let index in dbData) {
      let ticker = dbData[index].name
      let tickerCount = dbData[index].full_count
      let tickerSumm = dbData[index].full_price
      let tickerPrice = tickersPrice[index].price
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

      let loopMessage = `*${ticker}*   (${tickerCount})   ${trend}${percentNow.toFixed(
        2
      )}%\n${(tickerSumm * priceRub).toFixed(0)}${currency}   ➡️   ${(
        tickerSummNow * priceRub
      ).toFixed(0)}${currency}\n\n`
      MESSAGE += loopMessage
    }

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
      `💼 *Весь портфель:*  ${totalTrend}${totalPercentNow.toFixed(2)}%\n${(
        portfolioSumm * priceRub
      ).toFixed(0)}${currency}   ➡️   ${(portfolioSummNow * priceRub).toFixed(
        0
      )}${currency}   ${sticker}${(profitUsd * priceRub).toFixed(
        0
      )}${currency}\n`
    console.log(MESSAGE)
    return MESSAGE
  }
}

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

async function getBatchPrice(ID) {
  const url = `https://financialmodelingprep.com/api/v3/quote/${ID.toString()}?apikey=${config.get(
    'apikey'
  )}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    let obj = []
    for (let index in data) {
      obj.push({ name: data[index].symbol, price: data[index].price })
    }
    return obj
  } catch (e) {
    console.log('Ошибка в getBatchPrice', e)
  }
}

getCryptoPrice('BTC', 'USD')
async function getCryptoPrice(ID, currency) {
  const url = `https://api.nomics.com/v1/currencies/ticker?key=${config.get(
    'cryptoApiKey'
  )}&ids=${ID.toString()}&convert=${currency}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    let obj = []
    for (let index in data) {
      obj.push({ name: data[index].symbol, price: data[index].price })
    }
    console.log(obj)
    return obj
  } catch (e) {
    console.log('Ошибка в getBatchPrice', e)
  }
}
