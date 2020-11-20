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
const func = require('./functions')
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
let inlineStonks = Markup.inlineKeyboard([
  // Markup.callbackButton('$', 'stonksDollar'),
  Markup.callbackButton('₽', 'stonksRuble'),
  Markup.callbackButton('Buy', 'stonksBuy'),
  Markup.callbackButton('Sell', 'stonksSell'),
])
let inlineCrypto = Markup.inlineKeyboard([
  Markup.callbackButton('$', 'cryptoDollar'),
  // Markup.callbackButton('₽', 'cryptoRuble'),
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
  if ((await getStonks(ctx.from.id)) === 0) {
    inlineStonks = Markup.inlineKeyboard([
      // Markup.callbackButton('$', 'stonksDollar'),
      // Markup.callbackButton('₽', 'stonksRuble'),
      Markup.callbackButton('Buy', 'stonksBuy'),
      // Markup.callbackButton('Sell', 'stonksSell'),
    ])
    ctx.reply('Ваш портфель пуст', Extra.markup(inlineStonks))
  } else {
    inlineStonks = Markup.inlineKeyboard([
      // Markup.callbackButton('$', 'stonksDollar'),
      Markup.callbackButton('₽', 'stonksRuble'),
      Markup.callbackButton('Buy', 'stonksBuy'),
      Markup.callbackButton('Sell', 'stonksSell'),
    ])
    ctx.reply(
      await getStonks(ctx.from.id),
      Extra.markdown().markup(inlineStonks)
    )
  }
})

bot.command('crypto', async (ctx) => {
  if ((await getCrypto(ctx.from.id, 'crypto')) === 0) {
    inlineCrypto = Markup.inlineKeyboard([
      // Markup.callbackButton('$', 'stonksDollar'),
      // Markup.callbackButton('₽', 'stonksRuble'),
      Markup.callbackButton('Buy', 'cryptoBuy'),
      // Markup.callbackButton('Sell', 'stonksSell'),
    ])
    ctx.reply('Ваш портфель пуст', Extra.markup(inlineCrypto))
  } else {
    inlineCrypto = Markup.inlineKeyboard([
      // Markup.callbackButton('$', 'stonksDollar'),
      Markup.callbackButton('₽', 'cryptoRuble'),
      Markup.callbackButton('Buy', 'cryptoBuy'),
      Markup.callbackButton('Sell', 'cryptoSell'),
    ])
    ctx.reply(
      await getCrypto(ctx.from.id, 'crypto', '$'),
      Extra.markdown().markup(inlineCrypto)
    )
  }
})

bot.action('stonksDollar', async (ctx) => {
  // await ctx.answerCbQuery()
  inlineStonks = Markup.inlineKeyboard([
    Markup.callbackButton('₽', 'stonksRuble'),
    Markup.callbackButton('Buy', 'stonksBuy'),
    Markup.callbackButton('Sell', 'stonksSell'),
  ])
  await ctx.editMessageText(
    await getStonks(ctx.from.id, '$'),
    Extra.markdown().markup(inlineStonks)
  )
})
bot.action('stonksRuble', async (ctx) => {
  // await ctx.answerCbQuery()
  inlineStonks = Markup.inlineKeyboard([
    Markup.callbackButton('$', 'stonksDollar'),
    Markup.callbackButton('Buy', 'stonksBuy'),
    Markup.callbackButton('Sell', 'stonksSell'),
  ])
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
bot.action('cryptoDollar', async (ctx) => {
  // await ctx.answerCbQuery()
  inlineStonks = Markup.inlineKeyboard([
    Markup.callbackButton('₽', 'cryptoRuble'),
    Markup.callbackButton('Buy', 'cryptoBuy'),
    Markup.callbackButton('Sell', 'cryptoSell'),
  ])
  await ctx.editMessageText(
    await getCrypto(ctx.from.id, 'crypto', '$'),
    Extra.markdown().markup(inlineStonks)
  )
})
bot.action('cryptoRuble', async (ctx) => {
  // await ctx.answerCbQuery()
  inlineStonks = Markup.inlineKeyboard([
    Markup.callbackButton('$', 'cryptoDollar'),
    Markup.callbackButton('Buy', 'cryptoBuy'),
    Markup.callbackButton('Sell', 'cryptoSell'),
  ])
  await ctx.editMessageText(
    await getCrypto(ctx.from.id, 'crypto', '₽'),
    Extra.markdown().markup(inlineStonks)
  )
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
  // console.log(await func.checkCryptoTicker(ctx.message.text))
  if (
    await func.checkMessage(
      ctx.message.text.toUpperCase(),
      'ticker',
      ctx.session.market
    )
  ) {
    ctx.session.ticker = ctx.message.text.toUpperCase()
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
  } else {
    return ctx.reply('Не могу найти данный тикер. Проверьте написание.')
  }
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

getCount.hears(['❌ Стереть все'], async (ctx) => {
  ctx.reply('Начнем заново.\nВведите тикер', {
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
  if (
    (await func.checkMessage(ctx.message.text, 'count', ctx.session.market)) &&
    ctx.message.text !== '0'
  ) {
    if (
      ctx.session.operation === 'sell' &&
      (await countTickerForSell(
        ctx.from.id,
        ctx.session.market,
        ctx.session.ticker
      )) === 0
    ) {
      return ctx.reply(
        'Вы не можете продать тикер, которого у вас нет.\n Вернитесь назад и введите тикер: который есть в вашем портфеле.'
      )
    } else if (
      ctx.session.operation === 'sell' &&
      (await countTickerForSell(
        ctx.from.id,
        ctx.session.market,
        ctx.session.ticker
      )) < parseFloat(ctx.message.text)
    ) {
      return ctx.reply(
        `Вы пытаетесь продать ${ctx.message.text} позиций тикера ${
          ctx.session.ticker
        }, когда у вас есть только ${await countTickerForSell(
          ctx.from.id,
          ctx.session.market,
          ctx.session.ticker
        )} позиций.\nВведите снова количество`
      )
    } else {
      ctx.session.count = parseFloat(ctx.message.text)
      ctx.reply(
        'Введите цену покупки/продажи, $' +
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
    }
  } else {
    return ctx.reply('Введите верное количество')
  }
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
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  await ctx.scene.leave('getTickerPrice')
  ctx.scene.enter('getTicker')
})

getTickerPrice.on('text', async (ctx) => {
  if (
    (await func.checkMessage(ctx.message.text, 'price', ctx.session.market)) &&
    ctx.message.text !== '0'
  ) {
    ctx.session.price = parseFloat(ctx.message.text)
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
  } else {
    return ctx.reply('Введите верную цену')
  }
})

getDate.hears('◀️ Назад', async (ctx) => {
  ctx.reply(
    'Введите цену покупки/продажи, $' +
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
  if (await func.checkMessage(ctx.message.text, 'date', ctx.session.market)) {
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
  } else {
    return ctx.reply('Дата введена не верно. Введите дату в формате ДД.ММ.ГГГГ')
  }
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

// Функция запроса данных из БД и формирования ответа пользователю
async function getStonks(chatId, currency = '$') {
  let dbData = await db
    .collection('stonks')
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  console.log(dbData)
  // console.log(dbData.tickers)
  if (dbData === null || dbData.tickers.length <= 0) {
    return 0
  } else {
    dbData = dbData.tickers.sort(func.compare)
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
async function getCryptoPrice(ID, currency = 'USD') {
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
    id = dbData._id
    if (tickerArray.includes(ticker, 0)) {
      if (operation === 'sell') {
        newValues = {
          $inc: {
            'tickers.$.full_count': -count,
            'tickers.$.full_price': -tickerSumm,
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

        checkData = await db
          .collection(market)
          .findOne(
            { user: chatId.toString() },
            { projection: { _id: 0, tickers: 1 } }
          )
        for (let index in checkData.tickers) {
          if (
            checkData.tickers[index].name === ticker &&
            checkData.tickers[index].full_count === 0
          ) {
            await db
              .collection(market)
              .updateOne(
                { _id: id },
                { $pull: { tickers: { name: ticker } } },
                false
              )
          }
        }
      } else {
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
      }
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

async function countTickerForSell(chatId, market, ticker) {
  let dbData = await db
    .collection(market)
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  if (dbData === null) {
    return 0
  } else {
    for (let index in dbData.tickers) {
      if (dbData.tickers[index].name === ticker) {
        tickercount = dbData.tickers[index].full_count
      } else {
        tickercount = 0
      }
    }
    return tickercount
  }
}

async function getCrypto(chatId, market, currency = '$') {
  let dbData = await db
    .collection(market)
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  console.log(dbData)
  // console.log(dbData.tickers)
  if (dbData === null || dbData.tickers.length <= 0) {
    return 0
  } else {
    dbData = dbData.tickers.sort(func.compare)
    tickerArray = dbData.map((a) => a.name)
    let MESSAGE = '*Ваш портфель:*\n\n'
    let portfolioSumm = 0
    let portfolioSummNow = 0
    let tickersPrice = await getCryptoPrice(tickerArray)
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
