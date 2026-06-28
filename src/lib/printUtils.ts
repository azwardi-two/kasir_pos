import type { SaleHeader, SaleItem, SalePayment } from '../types'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ESC = 0x1B
const GS = 0x1D

function txt(s: string) {
  return new TextEncoder().encode(s)
}

export function buildReceipt(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const parts: number[][] = []

  function add(...args: (number | number[] | Uint8Array)[]) {
    for (const a of args) {
      if (typeof a === 'number') parts.push([a])
      else if (a instanceof Uint8Array) parts.push(Array.from(a))
      else parts.push(a)
    }
  }

  add(ESC, 0x40)
  add(GS, 0x21, 0)
  add(ESC, 0x4D, 1)
  add(ESC, 0x61, 1)
  add(ESC, 0x45, 1)
  add(txt('Fat House Coffe\n'))
  add(ESC, 0x45, 0)
  add(txt(header.invoice_no + '\n'))
  add(txt(formatDate(header.date) + '\n'))
  if (header.customer_name) add(txt(header.customer_name + '\n'))
  if (header.customer_phone) add(txt(header.customer_phone + '\n'))

  add(txt(''.padEnd(32, '-') + '\n'))

  add(ESC, 0x61, 0)
  for (const item of items) {
    const name = item.product_name.length > 16 ? item.product_name.slice(0, 16) + '..' : item.product_name.padEnd(16)
    const qty = String(item.qty).padStart(3)
    const sub = 'Rp ' + (item.price * item.qty).toLocaleString('id-ID')
    add(txt(name + ' ' + qty + ' ' + sub.padStart(11) + '\n'))
    if (item.note) add(txt('  - ' + item.note + '\n'))
  }

  add(txt(''.padEnd(32, '-') + '\n'))

  add(ESC, 0x45, 1)
  const totalFormatted = 'Rp ' + header.total.toLocaleString('id-ID')
  const totalStr = 'TOTAL'.padEnd(32 - totalFormatted.length) + totalFormatted
  add(txt(totalStr + '\n'))
  add(ESC, 0x45, 0)

  add(txt(''.padEnd(32, '-') + '\n'))

  for (const p of payments) {
    const payStr = ('Rp ' + p.amount.toLocaleString('id-ID')).padStart(19)
    add(txt(p.method.toUpperCase().padEnd(13) + payStr + '\n'))
  }
  const changeStr = ('Rp ' + header.change_amount.toLocaleString('id-ID')).padStart(19)
  add(txt('Kembali'.padEnd(13) + changeStr + '\n'))

  add(txt(''.padEnd(32, '-') + '\n'))

  add(ESC, 0x61, 1)
  add(txt('Terima kasih\n'))

  add(ESC, 0x61, 0)
  add(txt('\n'))
  add(GS, 0x56, 0x00)

  const flat = parts.flat()
  return new Uint8Array(flat)
}

export async function printUSB(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const nav = navigator as any
  if (!nav.usb) {
    throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome/Edge.')
  }

  const device = await (nav.usb as any).requestDevice()

  const data = buildReceipt(header, items, payments)

  await device.open()
  await device.selectConfiguration(1)

  const iface = device.configuration.interfaces[0]
  const endpoint = iface.alternate.endpoints.find((e: any) => e.direction === 'out')
  if (!endpoint) {
    await device.close()
    throw new Error('Tidak dapat menemukan endpoint USB untuk output')
  }

  await device.claimInterface(iface.interfaceNumber)
  await device.transferOut(endpoint.endpointNumber, data)
  await device.close()
}

export async function printBluetooth(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const nav = navigator as any
  if (!nav.bluetooth) {
    throw new Error('Bluetooth tidak didukung di browser ini. Gunakan Chrome Android.')
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      '000018ff-0000-1000-8000-00805f9b34fb',
    ],
  })

  const data = buildReceipt(header, items, payments)
  const server = await device.gatt.connect()

  let characteristic: BluetoothRemoteGATTCharacteristic | null = null
  const services = await server.getPrimaryServices()
  for (const svc of services) {
    const chars = await svc.getCharacteristics()
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        characteristic = c
        break
      }
    }
    if (characteristic) break
  }

  if (!characteristic) {
    await device.gatt.disconnect()
    throw new Error('Tidak dapat menemukan karakteristik write pada printer. Pastikan printer sudah menyala dan terpilih.')
  }

  const mtu = 512
  for (let offset = 0; offset < data.length; offset += mtu) {
    const chunk = data.slice(offset, offset + mtu)
    await characteristic.writeValue(chunk)
  }

  await new Promise(r => setTimeout(r, 500))
  device.gatt.disconnect()
}

export function printBrowser(header: SaleHeader, items: SaleItem[], payments: SalePayment[]): Promise<void> {
  if (document.getElementById('print-receipt-overlay')) {
    window.print()
    return Promise.resolve()
  }

  const content = buildHtmlReceipt(header, items, payments)

  const overlay = document.createElement('div')
  overlay.id = 'print-receipt-overlay'
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:Courier New,monospace;font-size:10px;color:#000'

  const receiptDiv = document.createElement('div')
  receiptDiv.style.cssText = 'width:100%;padding:2px 0;font-size:11px;box-sizing:border-box'
  receiptDiv.innerHTML = content

  const closeBtn = document.createElement('button')
  closeBtn.textContent = 'Tutup'
  closeBtn.style.cssText = 'margin-top:12px;padding:8px 24px;background:#6b7280;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer'
  closeBtn.onclick = () => {
    document.body.removeChild(overlay)
  }

  overlay.appendChild(receiptDiv)
  overlay.appendChild(closeBtn)
  document.body.appendChild(overlay)

  return new Promise((resolve) => {
    let resolved = false
    function done() {
      if (resolved) return
      resolved = true
      if (document.getElementById('print-receipt-overlay')) {
        document.body.removeChild(overlay)
      }
      window.removeEventListener('afterprint', done)
      resolve()
    }

    window.addEventListener('afterprint', done)
    setTimeout(done, 5000)
    window.print()
  })
}

export function receiptToText(header: SaleHeader, items: SaleItem[], payments: SalePayment[]): string {
  const data = buildReceipt(header, items, payments)
  const chars: number[] = []
  let i = 0
  while (i < data.length) {
    const b = data[i]
    if (b === 0x1B) {
      if (i + 1 < data.length) {
        const cmd = data[i + 1]
        if (cmd === 0x61) i += 3
        else if (cmd === 0x45) i += 3
        else if (cmd === 0x40) i += 2
        else i += 2
      } else i++
      continue
    }
    if (b === 0x1D) { i += 3; continue }
    if (b >= 0x20 || b === 0x0A || b === 0x0D) chars.push(b)
    i++
  }
  return new TextDecoder().decode(new Uint8Array(chars))
}

export function downloadReceiptTxt(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const text = receiptToText(header, items, payments)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `struk_${header.invoice_no.replace(/\//g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadReceiptBin(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const data = buildReceipt(header, items, payments)
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `struk_${header.invoice_no.replace(/\//g, '-')}.bin`
  a.click()
  URL.revokeObjectURL(url)
}

export function openRawBT(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const data = buildReceipt(header, items, payments)
  const binary = Array.from(data).map(b => String.fromCharCode(b)).join('')
  const base64 = btoa(binary)
  const url = `intent://print?base64=${encodeURIComponent(base64)}#Intent;scheme=rawbt;package=com.mashinteractive.rawbt;end`
  window.location.href = url
  setTimeout(() => downloadReceiptBin(header, items, payments), 2000)
}

function buildHtmlReceipt(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  const logoUrl = location.origin + '/fathouse.jpeg'
  return `
<div style="font-size:10px;line-height:1.3;width:100%;word-break:break-all">
<div style="text-align:center"><img src="${logoUrl}" style="width:3cm;height:3cm"></div>
<div style="text-align:center;font-weight:bold">Fat House Coffe</div>
<div style="text-align:center">${header.invoice_no}<br>${formatDate(header.date)}${header.customer_name ? '<br>' + header.customer_name : ''}${header.customer_phone ? '<br>' + header.customer_phone : ''}</div>
<hr style="border:none;border-top:1px dashed #000;margin:3px 0">
<table style="width:100%;font-size:10px;border-collapse:collapse">
  <tbody>
    ${items.map(i => `
      <tr>
        <td style="text-align:left">${i.product_name}${i.note ? '<br><span style="font-size:8px;color:#888">  - ' + i.note + '</span>' : ''}</td>
        <td style="text-align:center;white-space:nowrap">${i.qty}x</td>
        <td style="text-align:right;white-space:nowrap">${(i.price * i.qty).toLocaleString('id-ID')}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
<hr style="border:none;border-top:1px dashed #000;margin:3px 0">
<table style="width:100%;font-size:10px;border-collapse:collapse">
  <tr style="font-weight:bold"><td style="text-align:left">TOTAL</td><td style="text-align:right;white-space:nowrap">Rp ${header.total.toLocaleString('id-ID')}</td></tr>
</table>
<hr style="border:none;border-top:1px dashed #000;margin:3px 0">
<table style="width:100%;font-size:10px;border-collapse:collapse">
  ${payments.map(p => `
    <tr>
      <td style="text-align:left">${p.method.toUpperCase()}</td>
      <td style="text-align:right;white-space:nowrap">${p.amount.toLocaleString('id-ID')}</td>
    </tr>
  `).join('')}
  <tr><td style="text-align:left">Kembali</td><td style="text-align:right;white-space:nowrap">Rp ${header.change_amount.toLocaleString('id-ID')}</td></tr>
</table>
<hr style="border:none;border-top:1px dashed #000;margin:3px 0">
<div style="text-align:center">Terima kasih</div>
</div>`
}
