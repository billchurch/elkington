'use strict'
/* eslint-disable eqeqeq */
// fixme, need to revisit loose comparisons

const protocol = require('./protocol')

const parseMessage = function (msg) {
  var msgData = {}
  msgData.commandCode = msg.substring(2, 4)
  msgData.raw = msg.replace('\r', '').replace('\n', '')

  var msgLen = parseInt(msg.substring(0, 2), 16)
  if (msgLen > 0) msgData.length = msgLen

  var command

  if (protocol.commands[msgData.commandCode]) {
    command = protocol.commands[msgData.commandCode]
  }

  if (msgData.commandCode.length == 2) {
    if (msgData.commandCode.substring(0, 1) == msgData.commandCode.substring(0, 1).toUpperCase()) {
      msgData.direction = 'from'
    } else {
      msgData.direction = 'to'
    }
  }

  if (command) {
    msgData.message = command
  } else {
    msgData.message = 'Unknown message'
  }

  msgData.dataRaw = msg.substring(4, msg.length - 2)
  msgData.data = {}

  switch (msgData.commandCode) {
    case 'AR':
      msgData = parseAlarmReporting(msgData)
      break
    case 'AS':
      msgData = parseArmingStatusData(msgData)
      break
    case 'CC':
      msgData = parseControlOutputData(msgData)
      break
    case 'CS':
      msgData = parseControlOutputStatusData(msgData)
      break
    case 'CR':
      msgData = parseCustomValuesData(msgData)
      break
    case 'DS':
      msgData = parseLightingDeviceStatusData(msgData)
      break
    case 'KA':
      msgData = parseKeypadAreasData(msgData)
      break
    case 'IC':
      msgData = parseValidUserNumberData(msgData)
      break
    case 'IR':
      msgData = parseInsteonLightingDeviceStatusData(msgData)
      break
    case 'LD':
      msgData = parseSystemLogData(msgData)
      break
    case 'LW':
      msgData = parseTemperatureData(msgData)
      break
    case 'PC':
      msgData = parsePowerLineCarrierData(msgData)
      break
    case 'PS':
      msgData = parsePowerLineCarrierStatusData(msgData)
      break
    case 'RR':
      msgData = parseRealtimeClockData(msgData)
      break
    case 'SD':
      msgData = parseTextDescriptionsData(msgData)
      break
    case 'TC':
      msgData = parseTasksChangeUpdateData(msgData)
      break
    case 'TR':
      msgData = parseThermostatData(msgData)
      break
    case 'UA':
      msgData = parseValidUserCodeData(msgData)
      break
    case 'VN':
      msgData = parseVersionNumberData(msgData)
      break
    case 'XK':
      msgData = parseRealtimeClockData(msgData)
      break
    case 'ZC':
      msgData = parseZoneChangeData(msgData)
      break
    case 'ZD':
      msgData = parseZoneDefinitionData(msgData)
      break
    case 'ZP':
      msgData = parseZonePartitionData(msgData)
      break
    case 'ZS':
      msgData = parseZoneStatusData(msgData)
      break
  }
  return msgData
}

const parseAlarmReporting = function (msgData) {
  msgData.data.accountNumber = parseInt(msgData.dataRaw.substring(0, 6))
  msgData.data.alarmCode = parseInt(msgData.dataRaw.substring(6, 10))
  if (protocol.events[msgData.data.alarmCode.toString()]) {
    msgData.data.alarmMessage = protocol.events[msgData.data.alarmCode.toString()]
  } else {
    msgData.data.alarmMessage = 'Unknown alarm code message'
  }
  msgData.data.area = parseInt(msgData.dataRaw.substring(10, 12))
  msgData.data.zone = parseInt(msgData.dataRaw.substring(12, 15))
  msgData.data.telIp = parseInt(msgData.dataRaw.substring(15, 16))
  return msgData
}

const parseArmingStatusData = function (msgData) {
  var armStatuses = msgData.dataRaw.substring(0, 8).split('')
  var armUpStates = msgData.dataRaw.substring(8, 16).split('')
  var alarmStates = msgData.dataRaw.substring(16, 24).split('')

  for (let i = 1; i <= 8; i++) {
    msgData.data['area' + i] = {}

    msgData.data['area' + i].armStatus = protocol.armStatuses[armStatuses[i - 1]]
    msgData.data['area' + i].armUpState = protocol.armUpStates[armUpStates[i - 1]]
    msgData.data['area' + i].alarmState = protocol.alarmStates[alarmStates[i - 1]]
  }

  return msgData
}

const parseControlOutputData = function (msgData) {
  msgData.data.outputNumber = parseInt(msgData.dataRaw.substring(0, 3))
  msgData.data.outputState = parseInt(msgData.dataRaw.substring(3, 4))
  if (protocol.outputStates[msgData.data.outputState.toString()]) {
    msgData.data.outputState = protocol.outputStates[msgData.data.outputState.toString()]
  } else {
    msgData.data.outputState = 'Unknown output state message'
  }

  return msgData
}

const parseControlOutputStatusData = function (msgData) {
  for (let i = 1; i <= 208; i++) {
    msgData.data['controloutput' + i] = protocol.outputStates[msgData.dataRaw.substring(i - 1, i)]
  }

  return msgData
}

const parseCustomValuesData = function (msgData) {
  const customValues = {
    0: 'Number',
    1: 'Timer',
    2: 'Time of Day'
  }

  let msgs = msgData.dataRaw.substring(0, 2) === '00' ? 20 : 1
  let cursor = 0
  for (let i = 1; i <= msgs; i++) {
    let num = msgData.dataRaw.substring(0, 2)
    let property = (num === '00') ? i : num
    let data = msgData.dataRaw.substring((cursor + 2), (cursor + 8))
    msgData.data[property] = {}
    msgData.data[property].format = customValues[data.substring(5, 6).toString()]
    switch (parseInt(data.substring(5, 6))) {
      case 0:
      case 1:
        msgData.data[property].value = parseInt(data.substring(0, 5))
        break
      case 2:
        let hex = parseInt(data.substring(0, 5)).toString(16)
        msgData.data[property].value = parseInt(hex.substring(0, 2), 16) + ':' + parseInt(hex.substring(2, 4), 16)
        break
      default:
        throw ('unexpected type received from CR message: "' + parseInt(data.substring(5, 6)) + '". Entire message: ' + JSON.stringify(msgData))
    }
    cursor += 6
  }
  return msgData
}

const parseInsteonLightingDeviceStatusData = function (msgData) {
  msgData.data.device = msgData.dataRaw.substring(0, 3)

  return msgData
}

const parseKeypadAreasData = function (msgData) {
  let areaStatus = msgData.dataRaw.substring(0, 16).split('')
  msgData.data['keypad'] = {}

  for (let i = 0; i <= 15; i++) {
    let kpNum = (i + 1)
    msgData.data.keypad[kpNum] = {}
    msgData.data.keypad[kpNum].area = parseInt(areaStatus[i])
  }

  return msgData
}

const parseLightingDeviceStatusData = function (msgData) {
  msgData.data.device = msgData.dataRaw.substring(0, 3)
  msgData.data.status = msgData.dataRaw.substring(3, 4)

  return msgData
}

const parsePowerLineCarrierData = function (msgData) {
  msgData.data.houseCode = msgData.dataRaw.substring(0, 1)
  msgData.data.unitCode = parseInt(msgData.dataRaw.substring(1, 3))
  msgData.data.lightLevel = parseInt(msgData.dataRaw.substring(3, 5))
  return msgData
}

const parsePowerLineCarrierStatusData = function (msgData) {
  msgData.data.bank = msgData.dataRaw.substring(0, 1)
  msgData.data.levels = []
  for (let i = 1; i <= 65; i++) {
    var charCode = msgData.dataRaw.substring(i, i + 1).charCodeAt(0)
    msgData.data.levels.push(charCode - 48)
  }
  return msgData
}

const parseSystemLogData = function (msgData) {
  msgData.data.event = parseInt(msgData.dataRaw.substring(0, 4))
  msgData.data.eventName = protocol.events[msgData.data.event]
  msgData.data.eventData = parseInt(msgData.dataRaw.substring(4, 7))
  msgData.data.area = parseInt(msgData.dataRaw.substring(7, 8))
  msgData.data.hour = parseInt(msgData.dataRaw.substring(8, 10))
  msgData.data.minute = parseInt(msgData.dataRaw.substring(10, 12))
  msgData.data.month = parseInt(msgData.dataRaw.substring(12, 14))
  msgData.data.day = parseInt(msgData.dataRaw.substring(14, 16))
  msgData.data.logIndex = parseInt(msgData.dataRaw.substring(16, 19))
  msgData.data.dayOfWeek = parseInt(msgData.dataRaw.substring(19, 20))
  msgData.data.dayOfWeekName = protocol.daysOfWeek[msgData.data.dayOfWeek]
  msgData.data.year = parseInt('20' + msgData.dataRaw.substring(20, 22))

  var event = msgData.data.event

  var isZoneOrKeypad = false
  var isUserCode = false
  var isExpanderType = false
  var isEepromAddress = false
  var isVoiceMessage = false

  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1001) && (event <= 1110))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1128) && (event <= 1129))
  isZoneOrKeypad = isZoneOrKeypad || (event == 1131)
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1144) && (event <= 1156))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1239) && (event <= 1240))
  isZoneOrKeypad = isZoneOrKeypad || (event == 1298)
  isZoneOrKeypad = isZoneOrKeypad || (event == 1304)
  isZoneOrKeypad = isZoneOrKeypad || (event == 1350)
  isZoneOrKeypad = isZoneOrKeypad || (event == 1356)
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1365) && (event <= 1366))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1381) && (event <= 1382))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 1385) && (event <= 1386))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 4001) && (event <= 4208))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 5001) && (event <= 5208))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 6001) && (event <= 6208))
  isZoneOrKeypad = isZoneOrKeypad || ((event >= 7001) && (event <= 7208))

  isUserCode = isUserCode || ((event >= 1173) && (event <= 1238))
  isUserCode = isUserCode || ((event >= 1294) && (event <= 1295))
  isUserCode = isUserCode || (event == 1297)
  isUserCode = isUserCode || ((event >= 1299) && (event <= 1301))
  isUserCode = isUserCode || (event == 1303)
  isUserCode = isUserCode || ((event >= 1313) && (event <= 1329))
  isUserCode = isUserCode || ((event >= 1351) && (event <= 1352))
  isUserCode = isUserCode || (event == 1379)

  isExpanderType = isExpanderType || ((event >= 1132) && (event <= 1135))
  isExpanderType = isExpanderType || (event == 1141)
  isExpanderType = isExpanderType || (event == 1161)
  isExpanderType = isExpanderType || (event == 1367)
  isExpanderType = isExpanderType || (event == 1377)

  isEepromAddress = isEepromAddress || (event == 1136)

  isVoiceMessage = isVoiceMessage || (event == 1378)

  if (isZoneOrKeypad) {
    if (msgData.data.eventData <= 208) {
      msgData.data.eventDataText = 'Zone ' + msgData.data.eventData
    }
    if (msgData.data.eventData > 408) {
      var keypad = (msgData.data.eventData - 400) / 6
      var functionKey = (msgData.data.eventData - 400) % 6
      msgData.data.eventDataText = 'Keypad ' + keypad + ' Function ' + functionKey
    }
  } else if (isUserCode) {
    if (msgData.data.eventData <= 199) {
      msgData.data.eventDataText = 'User ' + msgData.data.eventData
    } else if (msgData.data.eventData == 201) {
      msgData.data.eventDataText = 'Installer'
    } else if (msgData.data.eventData == 202) {
      msgData.data.eventDataText = 'ElkRP'
    } else if (msgData.data.eventData == 203) {
      msgData.data.eventDataText = 'No User Code'
    }
  } else if (isExpanderType) {
    delete msgData.data.area // Does not apply!!!

    switch (msgData.data.eventData) {
      case 0:
      case 1367:
        msgData.data.eventDataText = 'Keypad'
        break

      case 1:
        msgData.data.eventDataText = 'Keypad'
        break

      case 2:
        msgData.data.eventDataText = 'Input Expander'
        break

      case 3:
        msgData.data.eventDataText = 'Output Expander'
        break

      case 4:
        msgData.data.eventDataText = 'Reserved'
        break

      case 5:
        msgData.data.eventDataText = 'Serial Expander'
        break
    }
  } else if (isEepromAddress) {
    msgData.data.eventDataText = 'EEPROM Memory Address ' + msgData.data.eventData
  } else if (isVoiceMessage) {
    if (msgData.data.eventData == 0) {
      msgData.data.eventDataText = 'Play Default Voice Message (VM' + 278 + ')'
    } else if ((msgData.data.eventData >= 209) && (msgData.data.eventData <= 323)) {
      msgData.data.eventDataText = 'Play Default Voice Message (VM' + msgData.data.eventData + ')'
    }
  }

  return msgData
}

const parseTasksChangeUpdateData = function (msgData) {
  msgData.data.task = msgData.dataRaw.substring(0, 3)

  return msgData
}

const parseRealtimeClockData = function (msgData) {
  msgData.data.time = msgData.dataRaw.substring(4, 6) + ':' + msgData.dataRaw.substring(2, 4) + ':' + msgData.dataRaw.substring(0, 2)
  msgData.data.dayfirst = msgData.dataRaw.substring(15, 16) === '1'
  msgData.data.clock24 = msgData.dataRaw.substring(14, 15) === '1'
  msgData.data.clockdst = msgData.dataRaw.substring(13, 14) === '1'
  if (msgData.data.dayfirst) {
    msgData.data.date = msgData.dataRaw.substring(7, 9) + '/' + msgData.dataRaw.substring(9, 11) + '/' + msgData.dataRaw.substring(11, 13)
  } else {
    msgData.data.date = msgData.dataRaw.substring(9, 11) + '/' + msgData.dataRaw.substring(7, 9) + '/' + msgData.dataRaw.substring(11, 13)
  }

  return msgData
}

const parseTemperatureData = function (msgData) {
  // TODO have this tested by someone with temp sensors
  // 66 – Length as ASCII hex
  // LW – Reply Temperature data
  // aaa – Keypad 1 temperature, as 3 ASCII characters, subtract 40. bbb – Keypad 2 temperature, as 3 ASCII characters, subtract 40. ... 13 – 3 ASCII characters for each keypad, 3 to 15
  // ppp – Keypad 16 temperature, as 3 ASCII characters, subtract 40. AAA – Zone Sensor 1 temperature, as 3 ASCII char., subtract 60. BBB – Zone Sensor 2 temperature, as 3 ASCII characters, sub 60. ... 13 – 3 ASCII characters for each Zone Sensor, 3 to 15
  // PPP – Zone Sensor 16 temperature, as 3 ASCII characters, sub 60. 00 – future use
  // CC – Checksum
  // 0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000091
  let kptemps = msgData.dataRaw.substring(0, 48).match(/.{1,3}/g)
  let zntemps = msgData.dataRaw.substring(48, 96).match(/.{1,3}/g)
  msgData.data['keypadTempF'] = {}
  msgData.data['zoneTempF'] = {}

  for (let i = 0; i <= 15; i++) {
    let num = (i + 1)
    msgData.data.keypadTempF[num] = (parseInt(kptemps[i]) - 40)
    msgData.data.zoneTempF[num] = (parseInt(zntemps[i]) - 60)
  }

  return msgData
}

const parseTextDescriptionsData = function (msgData) {
  msgData.data.type = parseInt(msgData.dataRaw.substring(0, 2))
  msgData.data.typeName = protocol.textDescriptionsTypes[msgData.data.type]
  msgData.data.address = parseInt(msgData.dataRaw.substring(2, 5))
  msgData.data.text = msgData.dataRaw.substring(5, 21).trim()
  return msgData
}

const parseThermostatData = function (msgData) {
  msgData.data.thermostatMode = parseInt(msgData.dataRaw.substring(2, 3))
  msgData.data.thermostatHold = parseInt(msgData.dataRaw.substring(3, 4))
  msgData.data.thermostatFan = parseInt(msgData.dataRaw.substring(4, 5))
  msgData.data.currentTemperature = parseInt(msgData.dataRaw.substring(5, 7))
  msgData.data.heatSetPoint = parseInt(msgData.dataRaw.substring(7, 9))
  msgData.data.coolSetPoint = parseInt(msgData.dataRaw.substring(9, 11))
  msgData.data.currentHumidity = parseInt(msgData.dataRaw.substring(11, 13))
  return msgData
}

const parseValidUserCodeData = function (msgData) {
  msgData.data.userCode = msgData.dataRaw.substring(0, 6)
  msgData.data.userCodeDigitCount = parseInt(msgData.dataRaw.substring(16, 17))
  // handle leading zeros in user code
  msgData.data.userCode = ('000000' + msgData.data.userCode).substr(-msgData.data.userCodeDigitCount)

  msgData.data.userCodeValidAreas = []
  var validAreas = msgData.dataRaw.substring(6, 8)
  // convert to binary with leading zeros
  validAreas = ('00000000' + parseInt(validAreas, 16).toString(2)).substr(-8)
  // convert to areas
  for (var i = 7; i >= 0; i--) {
    if (validAreas[i] == 1) { msgData.data.userCodeValidAreas.push('area' + (8 - i)) }
  }

  msgData.data.userCodeType = msgData.dataRaw.substring(17, 18)
  if (protocol.userCodeTypes[msgData.data.userCodeType.toString()]) {
    msgData.data.userCodeType = protocol.userCodeTypes[msgData.data.userCodeType.toString()]
  } else {
    msgData.data.temperatureMode = 'Unknown user code type message'
  }

  msgData.data.temperatureMode = msgData.dataRaw.substring(18, 19)
  if (protocol.temperatureModes[msgData.data.temperatureMode.toString()]) {
    msgData.data.temperatureMode = protocol.temperatureModes[msgData.data.temperatureMode.toString()]
  } else {
    msgData.data.temperatureMode = 'Unknown temperature mode message'
  }

  return msgData
}

const parseValidUserNumberData = function (msgData) {
  msgData.data.userCodeData = msgData.dataRaw.substring(0, 12)
  msgData.data.userNumber = parseInt(msgData.dataRaw.substring(12, 15))
  msgData.data.isValid = (parseInt(msgData.data.userCodeData) === 0)
  return msgData
}

const parseVersionNumberData = function (msgData) {
  msgData.data.m1Version = parseInt(msgData.dataRaw.substring(0, 2), 16) + '.' + parseInt(msgData.dataRaw.substring(2, 4), 16) + '.' + parseInt(msgData.dataRaw.substring(4, 6), 16)
  msgData.data.m1expVersion = parseInt(msgData.dataRaw.substring(6, 8), 16) + '.' + parseInt(msgData.dataRaw.substring(8, 10), 16) + '.' + parseInt(msgData.dataRaw.substring(10, 12), 16)
  return msgData
}

const parseZoneDefinitionData = function (msgData) {
  msgData.data.zone = {}
  for (let i = 0; i < msgData.dataRaw.length; i++) {
    let zone = (i + 1)
    msgData.data.zone[zone] = protocol.zoneDefinition[msgData.dataRaw.charAt(i)]
  }
  return msgData
}

const parseZoneChangeData = function (msgData) {
  msgData.data.zoneNumber = parseInt(msgData.dataRaw.substring(0, 3))
  msgData.data.zoneStatus = msgData.dataRaw.substring(3, 4)
  if (protocol.zoneStatuses[msgData.data.zoneStatus.toString()]) {
    msgData.data.zoneStatus = protocol.zoneStatuses[msgData.data.zoneStatus.toString()]
  } else {
    msgData.data.zoneStatus = 'Unknown zone status message'
  }

  return msgData
}

const parseZonePartitionData = function (msgData) {
  // returns zone: area
  // { "1": "1" }
  for (let i = 1; i <= 208; i++) {
    msgData.data[i] = msgData.dataRaw.substring(i - 1, i)
  }

  return msgData
}

const parseZoneStatusData = function (msgData) {
  for (let i = 1; i <= 208; i++) {
    msgData.data['zone' + i] = protocol.zoneStatuses[msgData.dataRaw.substring(i - 1, i)]
  }

  return msgData
}

module.exports.parseMessage = parseMessage
