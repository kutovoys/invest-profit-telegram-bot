const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const mongo = require('mongodb').MongoClient
const config = require('config')
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
  [
    Markup.callbackButton('₽', 'stonksRuble'),
    Markup.callbackButton('Transactions', 'transactionsStonks'),
  ],
  [
    Markup.callbackButton('Buy', 'stonksBuy'),
    Markup.callbackButton('Sell', 'stonksSell'),
  ],
])
let inlineCrypto = Markup.inlineKeyboard([
  [
    Markup.callbackButton('$', 'cryptoDollar'),
    Markup.callbackButton('Transactions', 'transactionsCrypto'),
  ],
  [
    Markup.callbackButton('Buy', 'cryptoBuy'),
    Markup.callbackButton('Sell', 'cryptoSell'),
  ],
])

mongo.connect(
  config.get('mongoUri'),
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log(err)
    }

    db = client.db(config.get('mongoDB'))
    bot.launch()
    console.log('Bot started...')
  }
)

bot.start((ctx) => {
  console.log('Id пользователя:', ctx.from.id)
  return ctx.reply(
    'Добро пожаловать!\nВыберите тип активов.\nВы можете ознакомится с краткой справкой по команде /help',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
})
bot.help((ctx) => {
  return ctx.reply(
    'Данный бот служит отслеживания финансовых активов, такие как рынок акций и криптовалюты. \n\nУ вас есть возможность получать информацию по портфелю акции и криптовалют отдельно. Также вы можете увидеть сводную информацию по двум портфелям. \nВы можете изменять свои активы с помощью кнопок Buy и Sell, тем самым занося ваши транзакции в бота.',
    Extra.markup(Markup.keyboard(mainMenu).resize())
  )
})

bot.command('stonks', async (ctx) => {
  if (await func.checkPortfolio(ctx.from.id, 'stonks')) {
    inlineStonks = Markup.inlineKeyboard([
      [
        Markup.callbackButton('₽', 'stonksRuble'),
        Markup.callbackButton('Transactions', 'transactionsStonks'),
      ],
      [
        Markup.callbackButton('Buy', 'stonksBuy'),
        Markup.callbackButton('Sell', 'stonksSell'),
      ],
    ])
    message = await func.makeMessage(ctx.from.id, 'stonks')
    ctx.reply(message[0], Extra.markdown().markup(inlineStonks))
  } else {
    inlineStonks = Markup.inlineKeyboard([
      Markup.callbackButton('Buy', 'stonksBuy'),
    ])
    ctx.reply('Ваш портфель пуст', Extra.markup(inlineStonks))
  }
})

bot.command('crypto', async (ctx) => {
  if (await func.checkPortfolio(ctx.from.id, 'crypto')) {
    inlineCrypto = Markup.inlineKeyboard([
      [
        Markup.callbackButton('₽', 'cryptoRuble'),
        Markup.callbackButton('Transactions', 'transactionsCrypto'),
      ],
      [
        Markup.callbackButton('Buy', 'cryptoBuy'),
        Markup.callbackButton('Sell', 'cryptoSell'),
      ],
    ])
    message = await func.makeMessage(ctx.from.id, 'crypto', '$')
    ctx.reply(message[0], Extra.markdown().markup(inlineCrypto))
  } else {
    inlineCrypto = Markup.inlineKeyboard([
      Markup.callbackButton('Buy', 'cryptoBuy'),
    ])
    ctx.reply('Ваш портфель пуст', Extra.markup(inlineCrypto))
  }
})
bot.command('all', async (ctx) => {
  message = await func.getAll(ctx.from.id, '$')
  if (message[1] === 'both') {
    inlineAll = Markup.inlineKeyboard([
      Markup.callbackButton('₽', 'allRuble'),
      Markup.callbackButton('Buy Stonks', 'stonksBuy'),
      Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
    ])
  } else if (message[1] === 'stonks') {
    inlineAll = Markup.inlineKeyboard([
      Markup.callbackButton('₽', 'allRuble'),
      Markup.callbackButton('Buy Stonks', 'stonksBuy'),
      Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
    ])
  } else if (message[1] === 'crypto') {
    inlineAll = Markup.inlineKeyboard([
      Markup.callbackButton('₽', 'allRuble'),
      Markup.callbackButton('Buy Stonks', 'stonksBuy'),
      Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
    ])
  } else {
    inlineAll = Markup.inlineKeyboard([
      Markup.callbackButton('₽', 'allRuble'),
      Markup.callbackButton('Buy Stonks', 'stonksBuy'),
      Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
    ])
  }
  ctx.reply(message[0], Extra.markdown().markup(inlineAll))
})
bot.action('stonksDollar', async (ctx) => {
  inlineStonks = Markup.inlineKeyboard([
    [
      Markup.callbackButton('₽', 'stonksRuble'),
      Markup.callbackButton('Transactions', 'transactionsStonks'),
    ],
    [
      Markup.callbackButton('Buy', 'stonksBuy'),
      Markup.callbackButton('Sell', 'stonksSell'),
    ],
  ])
  message = await func.makeMessage(ctx.from.id, 'stonks', '$')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineStonks))
})
bot.action('stonksRuble', async (ctx) => {
  inlineStonks = Markup.inlineKeyboard([
    [
      Markup.callbackButton('$', 'stonksDollar'),
      Markup.callbackButton('Transactions', 'transactionsStonks'),
    ],
    [
      Markup.callbackButton('Buy', 'stonksBuy'),
      Markup.callbackButton('Sell', 'stonksSell'),
    ],
  ])
  message = await func.makeMessage(ctx.from.id, 'stonks', '₽')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineStonks))
})
bot.action('stonksBuy', async (ctx) => {
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
  inlineCrypto = Markup.inlineKeyboard([
    [
      Markup.callbackButton('₽', 'cryptoRuble'),
      Markup.callbackButton('Transactions', 'transactionsCrypto'),
    ],
    [
      Markup.callbackButton('Buy', 'cryptoBuy'),
      Markup.callbackButton('Sell', 'cryptoSell'),
    ],
  ])
  message = await func.makeMessage(ctx.from.id, 'crypto', '$')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineCrypto))
})
bot.action('cryptoRuble', async (ctx) => {
  inlineCrypto = Markup.inlineKeyboard([
    [
      Markup.callbackButton('$', 'cryptoDollar'),
      Markup.callbackButton('Transactions', 'transactionsCrypto'),
    ],
    [
      Markup.callbackButton('Buy', 'cryptoBuy'),
      Markup.callbackButton('Sell', 'cryptoSell'),
    ],
  ])
  message = await func.makeMessage(ctx.from.id, 'crypto', '₽')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineCrypto))
})

bot.action('allRuble', async (ctx) => {
  inlineAll = Markup.inlineKeyboard([
    Markup.callbackButton('$', 'allDollar'),
    Markup.callbackButton('Buy Stonks', 'stonksBuy'),
    Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
  ])
  message = await func.getAll(ctx.from.id, '₽')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineAll))
})
bot.action('allDollar', async (ctx) => {
  inlineAll = Markup.inlineKeyboard([
    Markup.callbackButton('₽', 'allRuble'),
    Markup.callbackButton('Buy Stonks', 'stonksBuy'),
    Markup.callbackButton('Buy Crypto', 'cryptoBuy'),
  ])
  message = await func.getAll(ctx.from.id, '$')
  await ctx.editMessageText(message[0], Extra.markdown().markup(inlineAll))
})

bot.action('transactionsStonks', async (ctx) => {
  ctx.reply(await func.getTransactions(ctx.from.id, 'stonks'), Extra.markdown())
})
bot.action('transactionsCrypto', async (ctx) => {
  ctx.reply(await func.getTransactions(ctx.from.id, 'crypto'), Extra.markdown())
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
    countForSell = await func.countTickerForSell(
      ctx.from.id,
      ctx.session.market,
      ctx.session.ticker
    )
    if (ctx.session.operation === 'sell' && countForSell === 0) {
      return ctx.reply(
        'Вы не можете продать тикер, которого у вас нет.\n Вернитесь назад и введите тикер: который есть в вашем портфеле.'
      )
    } else if (
      ctx.session.operation === 'sell' &&
      countForSell < parseFloat(ctx.message.text)
    ) {
      return ctx.reply(
        `Вы пытаетесь продать ${ctx.message.text} позиций тикера ${ctx.session.ticker}, когда у вас есть только ${countForSell} позиций.\nВведите снова количество`
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
    reply_markup: {
      keyboard: [['️⬅️ На главную']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
  await ctx.scene.leave('getDate')
  ctx.scene.enter('getTicker')
})

getDate.on('text', async (ctx) => {
  if (await func.checkMessage(ctx.message.text, 'date', ctx.session.market)) {
    if (!func.isFutureDate(ctx.message.text)) {
      console.log('Проверка: Дата НЕ из будущего')
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
      console.log('Проверка: Дата из будущего')
      return ctx.reply('О, вы из будущего?\nВведите дату')
    }
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

  func.addToPortfolio(
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
