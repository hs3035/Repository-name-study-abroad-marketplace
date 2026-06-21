'use client'

import { useState } from 'react'
import type { Locale } from '@/app/lib/i18n'

type Method = 'wechat' | 'alipay'

type Props = {
  locale: Locale
  orderId: string
  contact: string
  note: string
  wechatQrUrl: string
  alipayQrUrl: string
}

export default function ManualPaymentSelector({
  locale,
  orderId,
  contact,
  note,
  wechatQrUrl,
  alipayQrUrl,
}: Props) {
  const zh = locale === 'zh'
  const [method, setMethod] = useState<Method>('wechat')
  const selectedQr = method === 'wechat' ? wechatQrUrl : alipayQrUrl

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-amber-900">{zh ? '选择付款方式' : 'Choose payment method'}</h2>
        <p className="text-xs text-amber-700">
          {zh
            ? '请选择微信或支付宝，页面会显示对应收款码。'
            : 'Choose WeChat or Alipay to see the matching payment QR code.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod('wechat')}
          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
            method === 'wechat'
              ? 'border-green-600 bg-green-50 text-green-800'
              : 'border-amber-200 bg-white text-gray-600 hover:border-green-300'
          }`}
        >
          微信支付
        </button>
        <button
          type="button"
          onClick={() => setMethod('alipay')}
          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
            method === 'alipay'
              ? 'border-blue-600 bg-blue-50 text-blue-800'
              : 'border-amber-200 bg-white text-gray-600 hover:border-blue-300'
          }`}
        >
          支付宝
        </button>
      </div>

      {contact && (
        <p className="text-sm text-amber-800">
          {zh ? '收款账号：' : 'Payment contact: '}
          <span className="font-semibold">{contact}</span>
        </p>
      )}
      {note && <p className="text-sm text-amber-800 whitespace-pre-wrap">{note}</p>}
      <p className="text-xs text-amber-700">
        {zh
          ? `付款备注请填写订单号：${orderId}`
          : `Please include this order ID in the payment note: ${orderId}`}
      </p>

      {selectedQr ? (
        <div className="rounded-xl bg-white border p-3">
          <p className="mb-2 text-center text-sm font-semibold text-gray-700">
            {method === 'wechat'
              ? (zh ? '微信收款码' : 'WeChat payment QR code')
              : (zh ? '支付宝收款码' : 'Alipay payment QR code')}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedQr}
            alt={method === 'wechat' ? '微信收款码' : '支付宝收款码'}
            className="mx-auto max-h-72 rounded-lg object-contain"
          />
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-dashed p-4 text-center text-sm text-gray-500">
          {method === 'alipay'
            ? (zh ? '支付宝收款码尚未上传，请使用上方收款账号付款或联系平台。' : 'Alipay QR code has not been uploaded yet. Use the payment contact above or contact support.')
            : (zh ? '微信收款码尚未上传，请使用上方收款账号付款或联系平台。' : 'WeChat QR code has not been uploaded yet. Use the payment contact above or contact support.')}
        </div>
      )}
    </div>
  )
}
