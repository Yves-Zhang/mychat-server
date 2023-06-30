/* eslint-disable no-case-declarations */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { openPushStream } from './filePushStream'

export async function recognizeSpeechFromFile(audioBlob) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.MICROSOFT_AZURE_SUBSCRIPTION_KEY, process.env.MICROSOFT_AZURE_SERVICE_REGION)
  speechConfig.speechRecognitionLanguage = 'zh-CN'
  // 获取 Blob 对象并创建可读流
  return new Promise((resolve, reject) => {
    const audioStream = openPushStream(null, audioBlob)
    const audioConfig = sdk.AudioConfig.fromStreamInput(audioStream)
    const speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    let recognizedText = ''

    speechRecognizer.recognizeOnceAsync((result: any) => {
      switch (result.reason) {
        case sdk.ResultReason.RecognizedSpeech:
          recognizedText = result.text
          break
        case sdk.ResultReason.NoMatch:
          reject(new Error('NOMATCH: Speech could not be recognized.'))
          break
        case sdk.ResultReason.Canceled:
          const cancellation = sdk.CancellationDetails.fromResult(result)
          let errorMessage = `CANCELED: Reason=${cancellation.reason}`

          if (cancellation.reason === sdk.CancellationReason.Error) {
            errorMessage += `\nCANCELED: ErrorCode=${cancellation.ErrorCode}`
            errorMessage += `\nCANCELED: ErrorDetails=${cancellation.errorDetails}`
            errorMessage += '\nCANCELED: Did you set the speech resource key and region values?'
          }

          reject(errorMessage)
          break
      }
      speechRecognizer.close()

      resolve(recognizedText)
    }, (error) => {
      globalThis.console.log('error', error)
      reject(error)
    })
  })
}

export async function generateAudioFile(text, settings?: any) {
  const {
    filename, language, voiceName = 'zh-CN-XiaomengNeural',
  } = settings || {}
  // now create the audio-config pointing to the output file.
  // You can also use audio output stream to initialize the audio config, see the docs for details.
  const audioConfig = filename ? sdk.AudioConfig.fromAudioFileOutput(filename) : null
  const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.MICROSOFT_AZURE_SUBSCRIPTION_KEY, process.env.MICROSOFT_AZURE_SERVICE_REGION)

  // setting the synthesis language, voice name, and output audio format.
  // see https://aka.ms/speech/tts-languages for available languages and voices
  speechConfig.speechSynthesisLanguage = language
  speechConfig.speechSynthesisVoiceName = voiceName
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

  // create the speech synthesizer.
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)

  // Before beginning speech synthesis, setup the callbacks to be invoked when an event occurs.

  // The event synthesizing signals that a synthesized audio chunk is received.
  // You will receive one or more synthesizing events as a speech phrase is synthesized.
  // You can use this callback to streaming receive the synthesized audio.
  synthesizer.synthesizing = function (s, e) {
    // const str = `(synthesizing) Reason: ${sdk.ResultReason[e.result.reason]} Audio chunk length: ${e.result.audioData.byteLength}`
    // globalThis.console.log(str)
  }

  // The event visemeReceived signals that a viseme is detected.
  // a viseme is the visual description of a phoneme in spoken language. It defines the position of the face and mouth when speaking a word.
  synthesizer.visemeReceived = function (s, e) {
    // const str = `(viseme) : Viseme event received. Audio offset: ${e.audioOffset / 10000}ms, viseme id: ${e.visemeId}`
    // globalThis.console.log(str)
  }

  // The event synthesis completed signals that the synthesis is completed.
  synthesizer.synthesisCompleted = function (s, e) {
    // globalThis.console.log(`(synthesized)  Reason: ${sdk.ResultReason[e.result.reason]} Audio length: ${e.result.audioData.byteLength}`)
  }

  // The synthesis started event signals that the synthesis is started.
  synthesizer.synthesisStarted = function (s, e) {
    // globalThis.console.log('(synthesis started)')
  }

  // The event signals that the service has stopped processing speech.
  // This can happen when an error is encountered.
  synthesizer.SynthesisCanceled = function (s, e) {
    const cancellationDetails = sdk.CancellationDetails.fromResult(e.result)
    // let str = `(cancel) Reason: ${sdk.CancellationReason[cancellationDetails.reason]}`
    if (cancellationDetails.reason === sdk.CancellationReason.Error) {
      // str += `: ${e.result.errorDetails}`
    }

    // globalThis.console.log(str)
  }

  // This event signals that word boundary is received. This indicates the audio boundary of each word.
  // The unit of e.audioOffset is tick (1 tick = 100 nanoseconds), divide by 10,000 to convert to milliseconds.
  synthesizer.wordBoundary = function (s, e) {
    // globalThis.console.log(`(WordBoundary), Text: ${e.text}, Audio offset: ${e.audioOffset / 10000}ms.`)
  }

  // start the synthesizer and wait for a result.
  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(text,
      (result) => {
        synthesizer.close()
        synthesizer = undefined
        resolve(result.audioData)
      },
      (err) => {
        globalThis.console.trace(`err - ${err}`)
        synthesizer.close()
        synthesizer = undefined
        reject(err)
      })
  })
}

// zh-CN-XiaoxiaoNeural(女)
// zh-CN-YunxiNeural(男)
// zh-CN-YunjianNeural(男)
// zh-CN-XiaoyiNeural(女)
// zh-CN-YunyangNeural(男) (女) (女
// zh-CN-XiaochenNeural)
// zh-CN-XiaohanNeural(女)
// zh-CN-XiaomengNeural(女)
// zh-CN-XiaomoNeural(女)
// zh-CN-XiaoqiuNeural(女
// zh-CN-XiaoruiNeural)
// zh-CN-XiaoshuangNeural(女、儿童)
// zh-CN-XiaoxuanNeural(女)
// zh-CN-XiaoyanNeural(女)
// zh-CN-XiaoyouNeural(女、儿童)
// zh-CN-XiaozhenNeural(女）
// zh-CN-YunfengNeural（男）
// zh-CN-YunhaoNeural（男）
// zh-CN-YunxiaNeural（男）
// zh-CN-YunyeNeural（男）
// zh-CN-YunzeNeural（男）
