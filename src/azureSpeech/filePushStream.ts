// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// pull in the required packages.
import fs from 'fs'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

function ReadInt32(fd) {
  const buffer = Buffer.alloc(4)
  const bytesRead = fs.readSync(fd, buffer)
  if (bytesRead !== 4)
    throw new Error(`Error reading 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: ${String(bytesRead)}`)

  return buffer.readInt32LE()
}

function ReadUInt16(fd) {
  const buffer = Buffer.alloc(2)
  const bytesRead = fs.readSync(fd, buffer)
  if (bytesRead !== 2)
    throw new Error(`Error reading 16-bit unsigned integer from .wav file header. Expected 2 bytes. Actual bytes read: ${String(bytesRead)}`)

  return buffer.readUInt16LE()
}

function ReadUInt32(fd) {
  const buffer = Buffer.alloc(4)
  const bytesRead = fs.readSync(fd, buffer)
  if (bytesRead !== 4)
    throw new Error(`Error reading unsigned 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: ${String(bytesRead)}`)

  return buffer.readUInt32LE()
}

function ReadString(fd, length) {
  const buffer = Buffer.alloc(length)
  const bytesRead = fs.readSync(fd, buffer)
  if (length !== bytesRead)
    throw new Error(`Error reading string from .wav file header. Expected ${String(length)} bytes. Actual bytes read: ${String(bytesRead)}`)

  return buffer.toString()
}

export function openPushStream(filename?: any, audioBlob?: Buffer) {
  if (audioBlob) {
    const pushStream = sdk.AudioInputStream.createPushStream()
    pushStream.write(audioBlob)
    pushStream.close()

    return pushStream
  }
  // Get the wave header for the file.
  const wavFileHeader = readWavFileHeader(filename)

  let format

  switch (wavFileHeader.tag) {
    case 1: // PCM
      format = sdk.AudioFormatTag.PCM
      break
    case 6:
      format = sdk.AudioFormatTag.ALaw
      break
    case 7:
      format = sdk.AudioFormatTag.MuLaw
      break
    default:
      throw new Error(`Wave format ${wavFileHeader.tag} is not supported`)
  }

  // Create the format for PCM Audio.
  format = sdk.AudioStreamFormat.getWaveFormat(wavFileHeader.framerate, wavFileHeader.bitsPerSample, wavFileHeader.nChannels, format)

  // create the push stream we need for the speech sdk.
  const pushStream = sdk.AudioInputStream.createPushStream(format)

  // open the file and push it to the push stream.
  // Notice: we skip 44 bytes for the typical wav header.
  fs.createReadStream(filename, { start: 44 }).on('data', (arrayBuffer) => {
    pushStream.write(arrayBuffer.slice() as any)
  }).on('end', () => {
    pushStream.close()
  })

  pushStream.write(audioBlob)
  pushStream.close()

  return pushStream
}

export function readWavFileHeader(audioFileName) {
  const fd = fs.openSync(audioFileName, 'r')

  if (ReadString(fd, 4) !== 'RIFF')
    throw new Error('Error reading .wav file header. Expected \'RIFF\' tag.')

  // File length
  ReadInt32(fd)
  if (ReadString(fd, 4) !== 'WAVE')
    throw new Error('Error reading .wav file header. Expected \'WAVE\' tag.')

  if (ReadString(fd, 4) !== 'fmt ')
    throw new Error('Error reading .wav file header. Expected \'fmt \' tag.')

  // Format size
  const formatSize = ReadInt32(fd)
  if (formatSize > 16)
    throw new Error(`Error reading .wav file header. Expected format size 16 bytes. Actual size: ${String(formatSize)}`)

  // Format tag
  const tag = ReadUInt16(fd)
  const nChannels = ReadUInt16(fd)
  const framerate = ReadUInt32(fd)
  // Average bytes per second
  ReadUInt32(fd)
  // Block align
  ReadUInt16(fd)
  const bitsPerSample = ReadUInt16(fd)

  fs.closeSync(fd)

  return { framerate, bitsPerSample, nChannels, tag }
}
