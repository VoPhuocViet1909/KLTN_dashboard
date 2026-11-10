// CSV sinh ở client để mở bằng Excel: UTF-8 có BOM (để đọc đúng tiếng Việt), dấu phẩy, xuống dòng CRLF.

export type CsvCell = string | number | null | undefined

/**
 * Một ô. Chữ bắt đầu bằng = + - @ (hoặc tab/xuống dòng) bị Excel hiểu là công thức, mà tên nhân viên do người
 * khác đặt, nên thêm dấu nháy đơn phía trước. Số không bị đổi.
 */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** Dấu thứ tự byte UTF-8 ở đầu file: thiếu nó Excel đọc tiếng Việt thành chữ lỗi. */
export const CSV_BOM = '﻿'

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob([CSV_BOM + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
