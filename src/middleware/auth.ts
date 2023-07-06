import CryptoJS from 'crypto-js'

// 解密函数
function decryptData(encryptedData, key) {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
  return decrypted.toString(CryptoJS.enc.Utf8)
}

function getBJTime() {
  const date = new Date()
  const options = {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  }

  // 将北京时间字符串转换为Date对象
  const dateObj = new Date(date.toLocaleString('en-US', options))

  // 将Date对象转换为Unix时间戳
  const timestamp = dateObj.getTime()

  return timestamp
}

function isDomainMatch(str) {
  if (str === '47.106.178.58')
    return true

  const koudingtuRegex = /(.*\.)?koudingtu\.com$/i
  const newBilityRegex = /(.*\.)?new-bility\.com$/i

  return koudingtuRegex.test(str) || newBilityRegex.test(str)
}

const auth = async (req, res, next) => {
  const Authorization = req.header('X-Custom-Header')

  if (!Authorization) {
    globalThis.console.log('没有Authorization')
    res.send({ status: 'Unauthorized', message: 'Unauthorized：Expired permission' ?? 'Please authenticate.', data: null })
  }

  if (Authorization) {
    const authString = decryptData(Authorization, 'koudingtu2023')
    const authInfo = JSON.parse(authString)

    if (getBJTime() - authInfo.timer > 1000 * 60 * 2 || !isDomainMatch(authInfo.domain)) {
      res.send({ status: 'Unauthorized', message: 'Unauthorized：Expired permission' ?? 'Please authenticate.', data: null })
      globalThis.console.log('Unauthorized：Expired', authInfo.domain)
    }

    else { next() }
  }
}

export { auth }
