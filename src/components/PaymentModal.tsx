import { useState } from 'react'

interface Props {
  total: number
  onConfirm: (amountPaid: number) => void
  onCancel: () => void
  loading: boolean
}

export function PaymentModal({ total, onConfirm, onCancel, loading }: Props) {
  const [amount, setAmount] = useState(total)
  const change = Math.max(0, amount - total)

  const quickAmounts = [
    total,
    Math.ceil(total / 5000) * 5000 + 5000,
    Math.ceil(total / 10000) * 10000 + 10000,
    Math.ceil(total / 50000) * 50000,
  ]
  const uniqueQuick = [...new Set(quickAmounts)].filter(a => a > total).slice(0, 3)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Pembayaran</h3>
        <p className="text-sm text-gray-500 mb-4">
          Total: <span className="font-semibold text-gray-800">Rp {total.toLocaleString('id-ID')}</span>
        </p>

        <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Dibayar</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold text-gray-800 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex flex-wrap gap-2 mb-4">
          {uniqueQuick.map(a => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 cursor-pointer"
            >
              Rp {a.toLocaleString('id-ID')}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 mb-5">
          <span>Kembali</span>
          <span className="text-xl font-bold text-green-600">Rp {change.toLocaleString('id-ID')}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(amount)}
            disabled={amount < total || loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {loading ? 'Memproses...' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
