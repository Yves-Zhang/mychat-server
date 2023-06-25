import svg2img from 'svg2img'

export async function convertSvgToImage(svgPath) {
  return new Promise((resolve, reject) => {
    // 将 SVG 转换为 PNG 格式
    svg2img(svgPath, (error, buffer) => {
      if (error) {
        console.error(error)
        reject(error)
      }
      else {
        // 将 PNG 文件转换为 base64 字符串并输出
        const base64 = buffer.toString('base64')
        resolve(`data:image/png;base64,${base64}`)

        // 或者将 PNG 文件保存为磁盘文件
        // fs.writeFileSync('output.png', buffer);
      }
    })
  })
}
