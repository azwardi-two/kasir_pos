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
    const payStr = ('Rp ' + p.amount.toLocaleString('id-ID')).padStart(20)
    add(txt(p.method.toUpperCase().padEnd(12) + payStr + '\n'))
  }
  const changeStr = ('Rp ' + header.change_amount.toLocaleString('id-ID')).padStart(20)
  add(txt('Kembali'.padEnd(12) + changeStr + '\n'))

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

export function printBrowser(header: SaleHeader, items: SaleItem[], payments: SalePayment[]): Promise<void> {
  if (document.getElementById('print-receipt-overlay')) {
    window.print()
    return Promise.resolve()
  }

  const content = buildHtmlReceipt(header, items, payments)

  const overlay = document.createElement('div')
  overlay.id = 'print-receipt-overlay'
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:Courier New,monospace;font-size:12px;color:#000'

  const receiptDiv = document.createElement('div')
  receiptDiv.style.cssText = 'width:58mm;padding:10px 8px'
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

function buildHtmlReceipt(header: SaleHeader, items: SaleItem[], payments: SalePayment[]) {
  return `
<h2>Fat House Coffe</h2>
<div class="sub">${header.invoice_no}<br>${formatDate(header.date)}${header.customer_name ? '<br>' + header.customer_name : ''}${header.customer_phone ? '<br>' + header.customer_phone : ''}</div>
<hr>
<table>
  <thead>
    <tr><th>Item</th><th class="center">Qty</th><th class="right">Subtotal</th></tr>
  </thead>
  <tbody>
    ${items.map(i => `
      <tr>
        <td style="text-align:left">${i.product_name}${i.note ? '<br><span style="font-size:10px;color:#888">  - ' + i.note + '</span>' : ''}</td>
        <td style="text-align:center">${i.qty}</td>
        <td style="text-align:right">${(i.price * i.qty).toLocaleString('id-ID')}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
<hr>
<table>
  <tr class="total-row"><td>TOTAL</td><td></td><td class="right">Rp ${header.total.toLocaleString('id-ID')}</td></tr>
</table>
<hr>
<table>
  ${payments.map(p => `
    <tr>
      <td style="text-align:left">${p.method.toUpperCase()}</td>
      <td style="text-align:right">${p.amount.toLocaleString('id-ID')}</td>
    </tr>
  `).join('')}
  <tr><td>Kembali</td><td></td><td class="right">Rp ${header.change_amount.toLocaleString('id-ID')}</td></tr>
</table>
<hr>
<div class="footer">Terima kasih</div>`
}
