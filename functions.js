const mongo = require('mongodb').MongoClient
const config = require('config')
const fetch = require('node-fetch')

mongo.connect(
  config.get('mongoUri'),
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log(err)
    }
    db = client.db(config.get('mongoDB'))
  }
)
// Функция проверки сообщения в зависимости от типа
async function checkMessage(text, type, market) {
  if (type === 'ticker') {
    if (market === 'stonks') {
      return checkStonksTicker(text)
    } else {
      return checkCryptoTicker(text)
    }
  } else if (type === 'count') {
    return /^(0\.(\d{0,8})|((?!0)\d{1,6})(\.\d{0,8})?)$/.test(text)
  } else if (type === 'price') {
    return /^(0\.(\d{0,8})|((?!0)\d{1,6})(\.\d{0,8})?)$/.test(text)
  } else if (type === 'date') {
    return checkDate(text)
  }
}

// Функция проверки существования тикера акций
async function checkStonksTicker(ID) {
  const url = `https://financialmodelingprep.com/api/v3/quote/${ID.toString()}?apikey=${config.get(
    'apikey'
  )}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    if (data[0].symbol === ID) {
      console.log('Тикер прошел проверку')
      return true
    } else {
      console.log('Тикер НЕ прошел проверку')
      return false
    }
  } catch (e) {
    console.log('Тикер НЕ прошел проверку')
    return false
  }
}

// Функция проверки существования тикера криптовалюты
async function checkCryptoTicker(ID) {
  const url = `https://api.nomics.com/v1/currencies/ticker?key=${config.get(
    'cryptoApiKey'
  )}&ids=${ID.toString()}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    if (data[0].symbol === ID) {
      console.log('Тикер прошел проверку')
      return true
    } else {
      console.log('Тикер НЕ прошел проверку')
      return false
    }
  } catch (e) {
    console.log('Тикер НЕ прошел проверку')
    return false
  }
}

// Функция проверки портфеля на наличие тикеров
async function checkPortfolio(chatId, market) {
  let dbData = await db
    .collection(market)
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  if (dbData === null || dbData.tickers.length <= 0) {
    console.log('Проверка: Портфель пуст')
    return false
  } else {
    console.log('Проверка: Портфель имеется')
    return true
  }
}

// Функция получения доступного для продажи количества тикеров
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

// Функция пакетного получения цены тикеров
async function getStonksPrice(ID) {
  const url = `https://financialmodelingprep.com/api/v3/quote/${ID.toString()}?apikey=${config.get(
    'apikey'
  )}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    let obj = []
    for (let index in data) {
      obj.push({
        name: data[index].symbol,
        price: data[index].price,
      })
    }
    return obj
  } catch (e) {
    console.log('Ошибка в getBatchPrice', e)
  }
}

// Функция пакетного получения цены криптовалют
async function getCryptoPrice(ID) {
  const url = `https://api.nomics.com/v1/currencies/ticker?key=${config.get(
    'cryptoApiKey'
  )}&ids=${ID.toString()}`
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

// Функция создания сообщения вывода общей информации по всем портфелям
async function getAll(chatId, currency) {
  getTransactions(chatId, 'stonks')
  console.time('getAll')
  if (
    (await checkPortfolio(chatId, 'stonks')) &&
    (await checkPortfolio(chatId, 'crypto'))
  ) {
    stonksData = await makeMessage(chatId, 'stonks')
    cryptoData = await makeMessage(chatId, 'crypto')
    if (currency === '₽') {
      priceRub = await getRublePrice('RUB=X')
    } else {
      priceRub = 1
    }

    allPortfolioSumm = stonksData[1] + cryptoData[1]
    allPortfolioSummNow = stonksData[2] + cryptoData[2]
    percentAll = Math.abs(100 - allPortfolioSummNow / (allPortfolioSumm / 100))
    profitAll = Math.abs(allPortfolioSummNow - allPortfolioSumm)
    if (allPortfolioSumm > allPortfolioSummNow) {
      alllSticker = '🤦‍♂️  -'
      totalTrend = '📉  -'
    } else if (allPortfolioSumm < allPortfolioSummNow) {
      alllSticker = '💰  +'
      totalTrend = '📈  +'
    } else {
      alllSticker = '⚖️  '
      totalTrend = '⚖️'
    }
    MESSAGE = `*Ваши портфели:*
    
*STONKS:*   ${stonksData[3]}${stonksData[4].toFixed(2)}%
${(stonksData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      stonksData[2] * priceRub
    ).toFixed(0)}${currency}

*CRYPTO:*   ${cryptoData[3]}${cryptoData[4].toFixed(2)}%
${(cryptoData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      cryptoData[2] * priceRub
    ).toFixed(0)}${currency}

💼 Сумма портфелей:  ${totalTrend}${percentAll.toFixed(2)}%
${(allPortfolioSumm * priceRub).toFixed(0)}${currency}   ➡️   ${(
      allPortfolioSummNow * priceRub
    ).toFixed(0)}${currency}   ${alllSticker}${(profitAll * priceRub).toFixed(
      0
    )}${currency}`
    let messageArray = [MESSAGE, 'both']
    console.timeEnd('getAll')
    return messageArray
  } else if (await checkPortfolio(chatId, 'stonks')) {
    stonksData = await makeMessage(chatId, 'stonks')
    if (currency === '₽') {
      priceRub = await getRublePrice('RUB=X')
    } else {
      priceRub = 1
    }
    profitAll = Math.abs(stonksData[2] - stonksData[1])
    MESSAGE = `*Ваши портфели:*
    
*STONKS:*   ${stonksData[3]}${stonksData[4].toFixed(2)}%
${(stonksData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      stonksData[2] * priceRub
    ).toFixed(0)}${currency}

*CRYPTO:*   Отсутствует

💼 Сумма портфелей:  ${stonksData[3]}${stonksData[4].toFixed(2)}%
${(stonksData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      stonksData[2] * priceRub
    ).toFixed(0)}${currency}   ${stonksData[5]}${(profitAll * priceRub).toFixed(
      0
    )}${currency}`
    let messageArray = [MESSAGE, 'stonks']
    console.timeEnd('getAll')
    return messageArray
  } else if (await checkPortfolio(chatId, 'crypto')) {
    cryptoData = await makeMessage(chatId, 'crypto')
    if (currency === '₽') {
      priceRub = await getRublePrice('RUB=X')
    } else {
      priceRub = 1
    }
    profitAll = Math.abs(cryptoData[2] - cryptoData[1])
    MESSAGE = `*Ваши портфели:*
    
*STONKS:*   Отсутствует

*CRYPTO:*      ${cryptoData[3]}${cryptoData[4].toFixed(2)}%
${(cryptoData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      cryptoData[2] * priceRub
    ).toFixed(0)}${currency}

💼 Сумма портфелей:  ${cryptoData[3]}${cryptoData[4].toFixed(2)}%
${(cryptoData[1] * priceRub).toFixed(0)}${currency}   ➡️   ${(
      cryptoData[2] * priceRub
    ).toFixed(0)}${currency}   ${cryptoData[5]}${(profitAll * priceRub).toFixed(
      0
    )}${currency}`
    let messageArray = [MESSAGE, 'crypto']
    console.timeEnd('getAll')
    return messageArray
  } else {
    messageArray = ['Все ваши портфели пусты', 'nothing']
    console.timeEnd('getAll')
    return messageArray
  }
}
// Функция сортировки по дате
function sortDyDate(a, b) {
  a = a.date.split('.').reverse().join('')
  b = b.date.split('.').reverse().join('')
  return a > b ? 1 : a < b ? -1 : 0
}
// Функция получения списка транзакций
async function getTransactions(chatId, market) {
  let dbData = await db
    .collection(market)
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, transactions: 1 } }
    )
  if (dbData === null || dbData.transactions.length <= 0) {
    MESSAGE = 'У вас нет транзакций'
    return MESSAGE
  } else {
    //console.log(dbData.transactions)
    dbData = dbData.transactions.sort(sortDyDate)
    //console.log(dbData)
    MESSAGE = 'Список ваших транзакций:\n'
    for (let index in dbData) {
      if (dbData[index].operation === 'buy') {
        operation = 'Покупка'
      } else {
        operation = 'Продажа'
      }
      MESSAGE += `${Number(index) + 1}. ${dbData[index].date} ${operation} *${
        dbData[index].ticker_name
      }* в количестве: *${dbData[index].trans_count}* по цене *${
        dbData[index].trans_price
      }$*\n`
    }
    console.log(MESSAGE)
    return MESSAGE
  }
}

// Функция получения цены Рубля
async function getRublePrice(ID) {
  console.time('RublePrice')
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=price`
  try {
    const response = await fetch(url)
    const json = await response.json()
    const value = json.quoteSummary.result[0].price.regularMarketPrice.raw
    console.timeEnd('RublePrice')
    return value
  } catch (e) {
    console.log('Ошибка в getPrice')
  }
}

// Функция создания сообщения для вывода портфеля
async function makeMessage(chatId, market, currency = '$') {
  console.time('makeMessage')
  let dbData = await db
    .collection(market)
    .findOne(
      { user: chatId.toString() },
      { projection: { _id: 0, tickers: 1 } }
    )
  if (dbData === null || dbData.tickers.length <= 0) {
    return 0
  } else {
    dbData = dbData.tickers.sort(compare)
    tickerArray = dbData.map((a) => a.name)
    let MESSAGE = '*Ваш портфель:*\n\n'
    let portfolioSumm = 0
    let portfolioSummNow = 0
    if (market === 'stonks') {
      tickersPrice = await getStonksPrice(tickerArray)
    } else {
      tickersPrice = await getCryptoPrice(tickerArray)
    }
    if (currency === '₽') {
      priceRub = await getRublePrice('RUB=X')
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
    let dataArray = [
      MESSAGE,
      portfolioSumm,
      portfolioSummNow,
      totalTrend,
      totalPercentNow,
      sticker,
    ]
    console.timeEnd('makeMessage')
    return dataArray
  }
}

// Функция добавления или удаления в портфель
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

// Функция проверки валидности введеной даты
function checkDate(value) {
  let arrD = value.split('.')
  arrD[1] -= 1
  let d = new Date(arrD[2], arrD[1], arrD[0])
  if (
    d.getFullYear() == arrD[2] &&
    d.getMonth() == arrD[1] &&
    d.getDate() == arrD[0]
  ) {
    console.log('Введена корректная дата.')
    return true
  } else {
    console.log('Введена некорректная дата!')
    return false
  }
}

function isFutureDate(idate) {
  let today = new Date().getTime()
  idate = idate.split('.')

  idate = new Date(idate[2], idate[1] - 1, idate[0]).getTime()
  return today - idate < 0
}

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

module.exports = {
  checkMessage,
  checkCryptoTicker,
  checkStonksTicker,
  checkDate,
  compare,
  checkPortfolio,
  getStonksPrice,
  getCryptoPrice,
  countTickerForSell,
  getRublePrice,
  getAll,
  makeMessage,
  addToPortfolio,
  isFutureDate,
  getTransactions,
}
