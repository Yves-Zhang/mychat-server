/* eslint-disable no-case-declarations */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

export function recognizeSpeechFromFile(audioFilePath) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.MICROSOFT_AZURE_SUBSCRIPTION_KEY, process.env.MICROSOFT_AZURE_SERVICE_REGION)
  speechConfig.speechRecognitionLanguage = 'en-US'
  return new Promise((resolve, reject) => {
    const audioConfig = sdk.AudioConfig.fromWavFileInput(audioFilePath)
    const speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    let recognizedText = ''

    speechRecognizer.recognizeOnceAsync((result) => {
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
    })
  })
}

export function generateAudioFile(text, voiceName?: string | undefined) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.MICROSOFT_AZURE_SUBSCRIPTION_KEY, process.env.MICROSOFT_AZURE_SERVICE_REGION)
  try {
    speechConfig.speechSynthesisVoiceName = voiceName || 'zh-CN-YunfengNeural'

    let synthesizer = new sdk.SpeechSynthesizer(speechConfig)

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log('synthesis finished.')
            resolve(result.audioData)
          }
          else {
            console.error(`Speech synthesis canceled, ${result.errorDetails
              }\n`)
            reject(result.errorDetails)
          }
          synthesizer.close()
          synthesizer = undefined
        },
        (err) => {
          console.trace(`err - ${err}`)
          reject(err)
          synthesizer.close()
          synthesizer = undefined
        })
    })
  }
  catch (exception) {
    console.error(exception)
  }
}

// generateAudioFile('Some text to synthesize into audio', 'en-US-JennyNeural')
//   .then(audioFile => console.log(`Successfully generated audio file: ${audioFile}`))

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
