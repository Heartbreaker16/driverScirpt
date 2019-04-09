const request = require('request')
const fs = require('fs')
const header = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36'
}
const name = '李朝文'

function getDateSchedule(time) {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: 'http://eomis.cn/api/driverapp?day=' + time,
        header
      },
      (err, res, body) => {
        body = JSON.parse(body)
        if (body.data && body.data.times) resolve(body.data.times)
        else getDateSchedule(time)
      }
    )
  })
}

function makeAppointment(arr,timeNow,timeIndex = arr.length - 2,personIndex = 0) {
  console.log(timeNow, timeIndex, personIndex)
  if (timeIndex < 0 || personIndex < 0) return
  if (!arr[timeIndex].person[personIndex])
    uploadForm(timeIndex, personIndex, timeNow).then(
      () => {
        return
      },
      () =>
        makeAppointment(arr, timeNow, timeIndex - personIndex, 1 - personIndex)
    )
  else makeAppointment(arr, timeNow, timeIndex - personIndex, 1 - personIndex)
}

function uploadForm(timeIndex, personIndex, day) {
  return new Promise((resolve, reject) => {
    request.post(
      {
        url: 'http://eomis.cn/api/makeapp',
        header,
        json: {
          day,
          name,
          personIndex,
          timeIndex
        }
      },
      (err, res, body) => {
        if (body.msg === '预约成功') {
          fs.appendFile('log.txt',`success at ${day} ${timeIndex} ${personIndex}\n`,()=>{})
          resolve('ok')
        } else reject(false)
      }
    )
  })
}

function timeNow() {
  const time = new Date()
  return {
    sign: time.getHours() === 6 ? `2019${time.getMonth()}${time.getDate()}` : false,
    obj: time
  }
}

function setDelay(timeObj){
  if(timeObj.getHours() > 6 || timeObj.getHours() < 5) 
    return 3600000
  if(timeObj.getHours() === 5 || timeObj.getMinutes() < 59) 
    return 60000
  else return 8000
}

function app() {
  const time = timeNow()
  fs.appendFile('log.txt',`${time.obj} ${time.sign}\n`,()=>{})
  if (time.sign)
    getDateSchedule(time.sign).then(schedule => makeAppointment(schedule, time.sign))
  else setTimeout(() => app(), setDelay(time.obj))
}

app()
