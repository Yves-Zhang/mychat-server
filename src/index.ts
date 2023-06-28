import express from 'express'
import bodyParser from 'body-parser'
import svgCaptcha from 'svg-captcha'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { recognizeSpeechFromFile } from './azureSpeech'
import { convertSvgToImage } from './utils/svgToJpg'

const app = express()
const router = express.Router()

// app.use('/www', express.static('public'))
app.use(express.json())

// 解析 audio/wav 和 multipart/form-data 请求体
app.use(bodyParser.raw({
  type: ['audio/wav', 'multipart/form-data'],
  limit: '50mb',
}))

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type, X-Custom-Header')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', auth, async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', auth, async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/speech-to-text', auth, async (req, res) => {
  const audioData = req.body // 从请求中获取音频数据

  // 调用语音识别函数
  try {
    const recognizedText = await recognizeSpeechFromFile(audioData)
    res.send({ status: 'Success', message: 'successfully', data: { text: recognizedText } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

// 返回验证码文本和 SVG 数据URI
router.get('/captcha', async (req, res) => {
  const options: any = {
    mathMin: req.query.mathMin || 1,
    mathMax: req.query.mathMax || 30,
    size: req.query.size || 6,
    ignoreChars: req.query.ignoreChars || '0o1iILl',
    noise: req.query.noise || 5,
    color: req.query.color || true,
    background: req.query.background || '#fff',
    width: req.query.width || 150,
    height: req.query.height || 50,
  }

  function randomChoice() {
    return Math.floor(Math.random() * 2) + 1
  }

  let type = 'create'
  if (randomChoice() === 1)
    type = 'createMathExpr'

  const captcha = svgCaptcha[type](options)

  const img = await convertSvgToImage(captcha.data)
  res.json({ text: captcha.text, img })
})

app.use('', router)
app.use('/apiChat', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
