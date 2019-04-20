const request = require('request')
const fs = require('fs')
const header = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36'
}
const name = '李朝文'

function getDateSchedule() {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: 'http://eomis.cn/api/driverapp?day=' + timeNow.sign,
        header
      },
      (err, res, body) => {
        body = JSON.parse(body)
        if (body.data && body.data.times) resolve(body.data.times)
        else getDateSchedule().then( _res => { if (_res.length) resolve(_res) })
      }
    )
  })
}

function makeAppointment(arr, timeIndex = arr.length - 2, personIndex = 0) {
  return new Promise((resolve, reject) => {
    if (timeIndex < 0 || personIndex < 0) return
    const person = arr[timeIndex].person[personIndex]
    if(person === name) resolve('ok')
    else if (!person)
      uploadForm(timeIndex, personIndex).then(
        res => {
          if(res === 'ok') resolve('ok')
        },
        () =>
          makeAppointment(arr, timeIndex - personIndex, 1 - personIndex).then(res => { if(res === 'ok') resolve('ok') })
      )
    else makeAppointment(arr, timeIndex - personIndex, 1 - personIndex).then(res => { if(res === 'ok') resolve('ok') })
  })
}

function uploadForm(timeIndex, personIndex) {
  return new Promise((resolve, reject) => {
    request.post(
      {
        url: 'http://eomis.cn/api/makeapp',
        header,
        json: {
          day: timeNow.sign,
          name,
          personIndex,
          timeIndex
        }
      },
      (err, res, body) => {
        if (body.msg === '预约成功') {
          log(timeIndex, personIndex)
          resolve('ok')
        } else reject(false)
      }
    )
  })
}

const timeNow = {
  time: {},
  sign: false,
  refresh: () => {
    timeNow.time = new Date()
    timeNow.sign = timeNow.time.getHours() === 6 ? `2019${timeNow.time.getMonth()}${timeNow.time.getDate()}` : false
  }
}

function setDelay(){
  const timeObj = timeNow.time
  if(timeObj.getHours() !== 5) 
    return 3600000
  else if(timeObj.getMinutes() < 59)
    return 60000
  else if(timeObj.getSeconds() < 54) 
    return 6000
  else return 1000
}

function log(timeIndex, personIndex){
  const path = '../server/files/html/driverlog.html'
  const time = timeNow.time
  const remark = timeIndex ? ` ${timeIndex + 8} ~ ${timeIndex + 9} ${personIndex} success` : ''
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) throw err
    const newContent = data.replace('<body>',`<body>
      <div${remark ? " class='red'" : ''}>${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()} ${('0'+time.getHours()).slice(-2)}:${('0'+time.getMinutes()).slice(-2)}:${('0'+time.getSeconds()).slice(-2)}${remark}</div>
    `)
    console.log(timeIndex, personIndex,remark,time,`<body>
    <div${remark ? " class='red'" : ''}>${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()} ${('0'+time.getHours()).slice(-2)}:${('0'+time.getMinutes()).slice(-2)}:${('0'+time.getSeconds()).slice(-2)}${remark}</div>
  `)
    fs.writeFile(path, newContent, 'utf8', err => {
      if (err) throw err
      console.log('success done')
    })
  })
}

function app() {
  timeNow.refresh()
  if (timeNow.sign)
    getDateSchedule().then(schedule =>
      makeAppointment(schedule).then(res => {
        if (res === 'ok') setTimeout(() => app(), setDelay())
      })
    )
  else {
    log()
    setTimeout(() => app(), setDelay())
  }
}

app()
