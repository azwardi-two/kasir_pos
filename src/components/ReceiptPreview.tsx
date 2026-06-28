import { useState, useEffect } from 'react'
import type { Receipt } from '../types'
import { printBrowser, printBluetooth, receiptToText, downloadReceiptTxt, downloadReceiptBin } from '../lib/printUtils'

interface Props {
  receipt: Receipt
  onClose: () => void
}

export function ReceiptPreview({ receipt, onClose }: Props) {
  const [showTextPreview, setShowTextPreview] = useState(false)
  const [btAvailable, setBtAvailable] = useState(false)
  const [btLoading, setBtLoading] = useState(false)
  const [btError, setBtError] = useState<string | null>(null)
  const { header, items, payments } = receipt

  useEffect(() => {
    setBtAvailable(!!(navigator as any).bluetooth)
  }, [])

  async function handlePrint() {
    onClose()
    await printBrowser(header, items, payments)
  }

  async function handlePrintBluetooth() {
    setBtLoading(true)
    setBtError(null)
    try {
      await printBluetooth(header, items, payments)
      onClose()
    } catch (err: any) {
      setBtError(err.message || 'Gagal print via Bluetooth')
    } finally {
      setBtLoading(false)
    }
  }

  const escposText = receiptToText(header, items, payments)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 print:hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Struk Pembayaran</h3>
          <p className="text-xs text-gray-500 mb-3">{header.invoice_no}</p>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm font-mono">
            <div className="text-center mb-1">
              <img src="/fathouse.jpeg" alt="Fat House Coffe" style={{ width: '3cm', height: '3cm' }} className="mx-auto" />
            </div>
            <div className="text-center font-bold text-base mb-2">Fat House Coffe</div>
            <div className="text-center text-xs text-gray-500 mb-2">
              {header.invoice_no}<br />
              {new Date(header.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {header.customer_name && <><br />{header.customer_name}</>}
              {header.customer_phone && <><br />{header.customer_phone}</>}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
              {items.map((i, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="flex-1">{i.product_name}</span>
                    <span className="w-8 text-center">{i.qty}x</span>
                    <span className="w-20 text-right">Rp {(i.price * i.qty).toLocaleString('id-ID')}</span>
                  </div>
                  {i.note && <div className="text-[10px] text-gray-500 pl-2 -mt-0.5 mb-0.5">- {i.note}</div>}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>Rp {header.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 pt-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{p.method.toUpperCase()}</span>
                  <span>Rp {p.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs">
                <span>Kembali</span>
                <span>Rp {header.change_amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 mt-3">Terima kasih</div>
          </div>

          {btError && (
            <div className="text-xs text-red-500 mb-3 text-center">{btError}</div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer"
            >
              Tutup
            </button>
            {btAvailable && (
              <button
                onClick={handlePrintBluetooth}
                disabled={btLoading}
                className="py-2.5 px-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
              >
                {btLoading ? 'Mengirim...' : 'Bluetooth'}
              </button>
            )}
            <button
              onClick={() => downloadReceiptTxt(header, items, payments)}
              className="py-2.5 px-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer"
              title="Download .txt (simulasi ESC/POS)"
            >
              .txt
            </button>
            <button
              onClick={() => setShowTextPreview(true)}
              className="py-2.5 px-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer"
              title="Preview teks ESC/POS"
            >
              Preview
            </button>
            <button
              onClick={() => downloadReceiptBin(header, items, payments)}
              className="py-2.5 px-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 cursor-pointer"
              title="Download .bin lalu buka dengan RawBT"
            >
              RawBT
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer"
            >
              {btAvailable ? 'Print Browser' : 'Print Struk'}
            </button>
          </div>
        </div>
      </div>

      {showTextPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Preview Teks ESC/POS</h3>
            <p className="text-xs text-gray-500 mb-3">Gunakan font monospace untuk melihat alignment spasi</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono leading-tight overflow-x-auto max-h-80 border">
              {escposText}
            </pre>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowTextPreview(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
