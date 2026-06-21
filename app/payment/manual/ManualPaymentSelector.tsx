'use client'

import { useState } from 'react'
import type { Locale } from '@/app/lib/i18n'
import type { ManualBankTransferConfig } from '@/app/lib/payment-mode'

type Method = 'wechat' | 'alipay' | 'bank'

type Props = {
  locale: Locale
  orderId: string
  contact: string
  note: string
  wechatQrUrl: string
  alipayQrUrl: string
  bankTransfer: ManualBankTransferConfig
}

export default function ManualPaymentSelector({
  locale,
  orderId,
  contact,
  note,
  wechatQrUrl,
  alipayQrUrl,
  bankTransfer,
}: Props) {
  const zh = locale === 'zh'
  const [method, setMethod] = useState<Method>('wechat')
  const selectedQr = method === 'wechat' ? wechatQrUrl : method === 'alipay' ? alipayQrUrl : ''

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-amber-900">{zh ? '选择付款方式' : 'Choose payment method'}</h2>
        <p className="text-xs text-amber-700">
          {zh
            ? '请选择微信、支付宝或银行转账，页面会显示对应付款信息。'
            : 'Choose WeChat, Alipay, or bank transfer to see the matching payment details.'}
        </p>
      </div>

      <div className={`grid gap-2 ${bankTransfer.enabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
        {bankTransfer.enabled && (
          <button
            type="button"
            onClick={() => setMethod('bank')}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              method === 'bank'
                ? 'border-gray-900 bg-gray-100 text-gray-900'
                : 'border-amber-200 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {zh ? '银行转账' : 'Bank transfer'}
          </button>
        )}
      </div>

      {method !== 'bank' && contact && (
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

      {method === 'bank' ? (
        <BankTransferDetails locale={locale} orderId={orderId} bankTransfer={bankTransfer} />
      ) : selectedQr ? (
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

function BankTransferDetails({
  locale,
  orderId,
  bankTransfer,
}: {
  locale: Locale
  orderId: string
  bankTransfer: ManualBankTransferConfig
}) {
  const zh = locale === 'zh'
  const rows = [
    { label: zh ? '银行名称' : 'Bank', value: bankTransfer.bankName },
    { label: zh ? '收款人' : 'Account holder', value: bankTransfer.accountName },
    { label: zh ? '银行账号' : 'Account number', value: bankTransfer.accountNumber },
    { label: 'Routing Number', value: bankTransfer.routingNumber },
    { label: 'SWIFT', value: bankTransfer.swiftCode },
  ].filter(row => row.value)

  return (
    <div className="rounded-xl bg-white border p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{zh ? '银行转账信息' : 'Bank transfer details'}</p>
        <p className="mt-1 text-xs text-gray-500">
          {zh
            ? '转账完成后，平台会人工确认付款。'
            : 'After transfer, the platform will manually confirm the payment.'}
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2 text-sm">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-500">{row.label}</span>
              <span className="text-right font-medium text-gray-900 break-all">{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
          {zh ? '银行转账信息暂未配置，请选择微信或支付宝。' : 'Bank transfer details are not configured yet. Please choose WeChat or Alipay.'}
        </div>
      )}

      {bankTransfer.note && <p className="text-sm text-gray-700 whitespace-pre-wrap">{bankTransfer.note}</p>}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        {zh
          ? `转账备注请务必填写订单号：${orderId}`
          : `Please include this order ID in the transfer memo: ${orderId}`}
      </div>
    </div>
  )
}
