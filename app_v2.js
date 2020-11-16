const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const WizardScene = require('telegraf/scenes/wizard')
const Scene = require('telegraf/scenes/base')
const mongo = require('mongodb').MongoClient
const config = require('config')
const fetch = require('node-fetch')
const Markup = require('telegraf/markup')
const { leave } = Stage
const bot = new Telegraf(config.get('token'))
const stage = new Stage()

const getTicker = new Scene('getTicker')
stage.register(getTicker)
const getCount = new Scene('getCount')
stage.register(getCount)
const getTickerPrice = new Scene('getTickerPrice')
stage.register(getTickerPrice)
const getDate = new Scene('getDate')
stage.register(getDate)
const check = new Scene('check')
stage.register(check)

bot.use(session())
bot.use(stage.middleware())

const mainMenu = [['/stonks', '/crypto'], ['/all']]
const inlineStonks = Markup.inlineKeyboard([
  Markup.callbackButton('$', 'stonksDollar'),
  Markup.callbackButton('₽', 'stonksRuble'),
  Markup.callbackButton('Buy', 'stonksBuy'),
  Markup.callbackButton('Sell', 'stonksSell'),
])
const inlineCrypto = Markup.inlineKeyboard([
  Markup.callbackButton('$', 'cryptoDollar'),
  Markup.callbackButton('₽', 'cryptoRuble'),
  Markup.callbackButton('Buy', 'cryptoBuy'),
  Markup.callbackButton('Sell', 'cryptoSell'),
])

mongo.connect(
  config.get('mongoUri'),
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log(err)
    }

    db = client.db('tgbot_test')
    bot.launch()
    console.log('Bot started...')
    // addToPortfolio(15043721, 'stonks', 'buy', 'VTI', 100, 170, '15.11.2020')
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
  ctx.reply(await getStonks(ctx.from.id), Extra.markdown().markup(inlineStonks))
})

bot.command('crypto', async (ctx) => {
  ctx.reply(
    'Ваша крипта: Тут в будущем будет ваш портфель',
    Extra.markdown().markup(inlineCrypto)
  )
})

bot.action('stonksDollar', async (ctx) => {
  // await ctx.answerCbQuery()
  await ctx.editMessageText(
    await getStonks(ctx.from.id, '$'),
    Extra.markdown().markup(inlineStonks)
  )
})
bot.action('stonksRuble', async (ctx) => {
  // await ctx.answerCbQuery()
  await ctx.editMessageText(
    await getStonks(ctx.from.id, '₽'),
    Extra.markdown().markup(inlineStonks)
  )
})
bot.action('stonksBuy', async (ctx) => {
  // await ctx.answerCbQuery()
  ctx.session.market = 'stonks'
  ctx.session.operation = 'buy'
  ctx.reply('Введите тикер', {
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  ctx.scene.enter('getTicker')
})
bot.action('stonksSell', async (ctx) => {
  // await ctx.answerCbQuery()
  ctx.session.market = 'stonks'
  ctx.session.operation = 'sell'
  ctx.reply('Введите тикер', {
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  ctx.scene.enter('getTicker')
})

bot.action('cryptoBuy', async (ctx) => {
  // await ctx.answerCbQuery()
  ctx.session.market = 'crypto'
  ctx.session.operation = 'buy'
  ctx.reply('Введите тикер', {
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  ctx.scene.enter('getTicker')
})
bot.action('cryptoSell', async (ctx) => {
  // await ctx.answerCbQuery()
  ctx.session.market = 'crypto'
  ctx.session.operation = 'sell'
  ctx.reply('Введите тикер', {
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  ctx.scene.enter('getTicker')
})

bot.hears('️⬅️ На главную', (ctx) => {
  return ctx.reply(
    'Добро пожаловать!\nВыберите тип активов.',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
})

getTicker.hears('️⬅️ На главную', (ctx) => {
  ctx.session = null
  return ctx.reply(
    'Добро пожаловать!\nВыберите тип активов.',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
})

getTicker.on('text', async (ctx) => {
  if (ctx.message.text === '◀️ Назад') {
    return ctx.reply(
      'Вы уже вернулись в самое начало. Введите, пожалуйста, тикер.'
    )
  }
  checkTicker = await getPrice(ctx.message.text)
  if (checkTicker === undefined) {
    return ctx.reply('Не могу найти данный тикер. Проверьте написание.')
  }
  ctx.session.ticker = ctx.message.text
  ctx.reply(
    'Введите количество' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}`,
    {
      reply_markup: {
        keyboard: [['◀️ Назад']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('getTicker')
  ctx.scene.enter('getCount')
})

getCount.hears('◀️ Назад', async (ctx) => {
  ctx.reply('Введите тикер', {
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  await ctx.scene.leave('getCount')
  ctx.scene.enter('getTicker')
})

getCount.on('text', async (ctx) => {
  checkCount = parseInt(ctx.message.text)
  if (isNaN(checkCount)) {
    return ctx.reply('Пожалуйста введите число.')
  }
  console.log(checkCount)
  ctx.session.count = ctx.message.text
  ctx.reply(
    'Введите цену покупки/продажи' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}\nКоличество: ${ctx.session.count}`,
    {
      reply_markup: {
        keyboard: [['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('getCount')
  ctx.scene.enter('getTickerPrice')
})

getTickerPrice.hears('◀️ Назад', async (ctx) => {
  ctx.reply(
    'Введите количество' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}`,
    {
      reply_markup: {
        keyboard: [['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('getTickerPrice')
  ctx.scene.enter('getCount')
})

getTickerPrice.hears(['❌ Стереть все'], async (ctx) => {
  ctx.reply('Начнем заново.\nВведите тикер', {
    reply_markup: { remove_keyboard: true },
  })
  await ctx.scene.leave('getTickerPrice')
  ctx.scene.enter('getTicker')
})

getTickerPrice.on('text', async (ctx) => {
  checkPrice = parseInt(ctx.message.text)
  if (isNaN(checkPrice)) {
    return ctx.reply('Пожалуйста введите число.')
  }
  ctx.session.price = ctx.message.text
  keyboardDate = new Date().toLocaleDateString('ru')
  ctx.reply(
    'Введите дату операции в формате ДД.ММ.ГГГГ' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}\nКоличество: ${ctx.session.count}\nЦена: ${ctx.session.price}$`,
    {
      reply_markup: {
        keyboard: [[keyboardDate], ['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('getTickerPrice')
  ctx.scene.enter('getDate')
})

getDate.hears('◀️ Назад', async (ctx) => {
  ctx.reply(
    'Введите цену покупки/продажи' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}\nКоличество: ${ctx.session.count}`,
    {
      reply_markup: {
        keyboard: [['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('getDate')
  ctx.scene.enter('getTickerPrice')
})

getDate.hears(['❌ Стереть все'], async (ctx) => {
  ctx.reply('Начнем заново.\nВведите тикер', {
    reply_markup: { remove_keyboard: true },
  })
  await ctx.scene.leave('getDate')
  ctx.scene.enter('getTicker')
})

getDate.on('text', async (ctx) => {
  ctx.session.date = ctx.message.text
  ctx.reply(
    '❗️ Проверьте все данные и нажмите "Все верно", если они корректны: ' +
      `\n\nТикер: *${ctx.session.ticker}*\nКоличество: *${ctx.session.count}*\nЦена: *${ctx.session.price}*$\nДата: *${ctx.session.date}*`,
    {
      reply_markup: {
        keyboard: [['️✅ Все верно'], ['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
      parse_mode: 'markdown',
    }
  )
  await ctx.scene.leave('getDate')
  ctx.scene.enter('check')
})

check.hears('◀️ Назад', async (ctx) => {
  keyboardDate = new Date().toLocaleDateString('ru')
  ctx.reply(
    'Введите дату операции в формате ДД.ММ.ГГГГ' +
      `\n\nУже введенные данные:\nТикер: ${ctx.session.ticker}\nКоличество: ${ctx.session.count}\nЦена: ${ctx.session.price}$`,
    {
      reply_markup: {
        keyboard: [[keyboardDate], ['◀️ Назад', '❌ Стереть все']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  )
  await ctx.scene.leave('check')
  ctx.scene.enter('getDate')
})

check.hears(['❌ Стереть все'], async (ctx) => {
  ctx.reply('Начнем заново.\nВведите тикер', {
    reply_markup: { remove_keyboard: true },
  })
  await ctx.scene.leave('check')
  ctx.scene.enter('getTicker')
})

check.hears('️✅ Все верно', (ctx) => {
  ctx.reply(
    '✅ Спасибо! Ваша транзакция добавлена.',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
  ctx.scene.leave('main')

  // Здесь пишем добавление в базу
  addToPortfolio(
    ctx.from.id,
    ctx.session.market,
    ctx.session.operation,
    ctx.session.ticker,
    ctx.session.count,
    ctx.session.price,
    ctx.session.date
  )
  console.log(
    ctx.session.market,
    ctx.session.operation,
    ctx.session.ticker,
    ctx.session.count,
    ctx.session.price,
    ctx.session.date
  )
  ctx.session = null
})

// Функция сортировки массива
function compare(a, b) {
  if (a.name < b.name) {
    return -1
  }
  if (a.name > b.name) {
    return 1
  }
  return 0
}

// Функция запроса данных из БД и формирования ответа пользователю
async function getStonks(chatId, currency = '$') {
  let dbData = await db
    .collection('stonks')
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  console.log(dbData)
  if (dbData === null) {
    return (MESSAGE = 'Ваш портфель пуст.')
  } else {
    dbData = dbData.tickers.sort(compare)
    console.log(dbData)
    tickerArray = dbData.map((a) => a.name)
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

// Функция получения цены
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

// Функция пакетного получения цены тикеров
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

// Функция пакетного получения цены криптовалют
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
    console.log('Ошибка в getCryptoPrice', e)
  }
}

async function addToPortfolio(
  chatId,
  market,
  operation,
  ticker,
  count,
  price,
  date
) {
  let tickerSumm = count * price
  // if (market === 'stonks') {
  //   nowPrice = await getPrice(ticker)
  // } else if (market === 'crypto') {
  //   nowPrice = getCryptoPrice(ticker)
  // } else {
  //   console.log('Something wrong...')
  // }
  let dbData = await db.collection(market).findOne({ user: chatId.toString() })
  if (dbData === null) {
    await db.collection(market).insertOne({
      user: chatId.toString(),
      tickers: [{ name: ticker, full_count: count, full_price: tickerSumm }],
      transactions: [
        {
          operation: operation,
          date: date,
          ticker_name: ticker,
          trans_count: count,
          trans_price: price,
        },
      ],
    })
  } else {
    tickerArray = dbData.tickers.map((a) => a.name)
    console.log(tickerArray)
    id = dbData._id
    if (tickerArray.includes(ticker, 0)) {
      newValues = {
        $inc: {
          'tickers.$.full_count': count,
          'tickers.$.full_price': tickerSumm,
        },
        $push: {
          transactions: {
            operation: operation,
            date: date,
            ticker_name: ticker,
            trans_count: count,
            trans_price: price,
          },
        },
      }
      await db
        .collection(market)
        .updateOne({ _id: id, 'tickers.name': ticker }, newValues)
    } else {
      newValues = {
        $push: {
          tickers: {
            name: ticker,
            full_count: count,
            full_price: tickerSumm,
          },
          transactions: {
            operation: operation,
            date: date,
            ticker_name: ticker,
            trans_count: count,
            trans_price: price,
          },
        },
      }
      await db.collection(market).updateOne({ _id: id }, newValues)
    }
  }
}
