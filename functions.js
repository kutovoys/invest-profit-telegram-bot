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
    console.log('Ошибка в checkCryptoTicker')
    return false
  }
}

async function checkStonksTicker(ID) {
  //получаем имя бумаги
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=price`
  try {
    const response = await fetch(url)
    const data = await response.json()
    if (data.quoteSummary.result[0].price.symbol === ID) {
      console.log('Тикер прошел проверку')
      return true
    } else {
      console.log('Тикер НЕ прошел проверку')
      return false
    }
  } catch (e) {
    console.log('Ошибка в checkStonksTicker')
    return false
  }
}

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
}
