import Tesseract from 'tesseract.js'

export interface ExtractedItem {
  name: string
  quantity: number
  price: number
  originalLine: string
}

export interface ParsedReceipt {
  items: ExtractedItem[]
  subtotal: number
  tax: number
  total: number
  merchant?: string
  date?: string
  rawText: string
}

// --- NEW: Image Preprocessing Function ---
export async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('Canvas context failed')

        // Set canvas size to image size
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw image
        ctx.drawImage(img, 0, 0)
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convert to grayscale and apply threshold (Binarization)
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          // Threshold: if lighter than 140, make white (255), else black (0)
          const val = avg > 140 ? 255 : 0
          data[i] = val     // R
          data[i + 1] = val // G
          data[i + 2] = val // B
        }
        
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  // 1. Preprocess the image first
  console.log('Preprocessing image...')
  const processedImage = await preprocessImage(imageFile)
  
  // 2. Run OCR on the cleaned image
  const { data: { text } } = await Tesseract.recognize(
    processedImage,
    'eng',
    {
      logger: (m: any) => console.log('OCR Progress:', m.status, m.progress),
    } as any // Cast to 'any' to bypass strict TypeScript typing
  )
  return text
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line)
  
  const items: ExtractedItem[] = []
  let subtotal = 0
  let tax = 0
  let total = 0
  let merchant = ''
  let date = ''

  // Extract merchant
  const merchantLines = lines.slice(0, 3).filter(line => 
    /[A-Z]{3,}/.test(line) && !/\d/.test(line) && line.length < 40
  )
  merchant = merchantLines.join(' ').replace(/[^A-Z\s&]/g, '').trim()

  // Extract date
  const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i
  const dateMatch = rawText.match(datePattern)
  if (dateMatch) {
    date = dateMatch[1]
  }

  const pricePattern = /(\d{1,3}(?:[.,]\d{3})+|\d+[.,]\d{2})/g
  
  const parseIndonesianNumber = (str: string): number => {
    if (str.includes(',') && !str.includes('.')) {
      return parseFloat(str.replace(/,/g, ''))
    } else if (str.includes('.') && !str.includes(',')) {
      const parts = str.split('.')
      if (parts[parts.length - 1].length === 2) {
        return parseFloat(str.replace(/\./g, ','))
      } else {
        return parseFloat(str.replace(/\./g, ''))
      }
    } else if (str.includes(',') && str.includes('.')) {
      const lastComma = str.lastIndexOf(',')
      const lastDot = str.lastIndexOf('.')
      if (lastComma > lastDot) {
        return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'))
      } else {
        return parseFloat(str.replace(/,/g, ''))
      }
    }
    return parseFloat(str)
  }

  const totalKeywords = ['SUBTOTAL', 'TAX', 'TOTAL', 'GRAND TOTAL', 'PPN', 'PAJAK']
  
  // NEW: Look for totals that might be on the next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    const nextLine = lines[i + 1] || ''

    // Check if current line has a total keyword
    if (totalKeywords.some(keyword => upperLine.includes(keyword))) {
      // Check if price is on the same line
      const prices = line.match(pricePattern)
      if (prices && prices.length > 0) {
        const lastPrice = prices[prices.length - 1]
        const amount = parseIndonesianNumber(lastPrice)
        
        if (upperLine.includes('GRAND TOTAL') || (upperLine.includes('TOTAL') && amount > 50000)) {
          total = amount
        } else if (upperLine.includes('SUBTOTAL')) {
          subtotal = amount
        } else if (upperLine.includes('TAX') || upperLine.includes('PAJAK') || upperLine.includes('PPN')) {
          tax = amount
        }
      } 
      // NEW: Check if price is on the next line
      else if (nextLine) {
        const nextPrices = nextLine.match(pricePattern)
        if (nextPrices && nextPrices.length > 0) {
          const lastPrice = nextPrices[nextPrices.length - 1]
          const amount = parseIndonesianNumber(lastPrice)
          
          if (upperLine.includes('GRAND TOTAL') || (upperLine.includes('TOTAL') && amount > 50000)) {
            total = amount
          } else if (upperLine.includes('SUBTOTAL')) {
            subtotal = amount
          } else if (upperLine.includes('TAX') || upperLine.includes('PAJAK') || upperLine.includes('PPN')) {
            tax = amount
          }
        }
      }
    }

    // Skip metadata
    if (line.includes('Receipt No') || line.includes('Cashier') || 
        line.includes('QRIS') || line.includes('HALAL') || 
        line.includes('PROMO') || line.includes('WA.') ||
        line.includes('APPR') || line.includes('BATCH')) {
      continue
    }

    // Parse line items
    const prices = line.match(pricePattern)
    if (prices && prices.length > 0) {
      const lastPrice = prices[prices.length - 1]
      const price = parseIndonesianNumber(lastPrice)
      
      let name = line.replace(lastPrice, '').trim()
      name = name.replace(/^[()\-:\d\s]+/, '').trim()
      name = name.replace(/[^A-Za-z0-9\s]/g, ' ')
      name = name.replace(/\s+/g, ' ').trim()
      
      if (name.length > 2 && price > 100 && price < 10000000) {
        items.push({
          name,
          quantity: 1,
          price,
          originalLine: line
        })
      }
    }
  }

  if (total === 0 && subtotal > 0) {
    total = subtotal + tax
  }
  
  if (subtotal === 0 && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + item.price, 0)
  }

  return {
    items,
    subtotal,
    tax,
    total,
    merchant,
    date,
    rawText
  }
}