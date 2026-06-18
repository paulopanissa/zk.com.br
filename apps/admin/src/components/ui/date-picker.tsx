import { useState } from 'react'
import { DatePicker as ArkDatePicker, parseDate, Portal } from '@ark-ui/react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  id?: string
  value?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  onValueChange?: (value: string | undefined) => void
}

function applyDateMask(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget
  const cursorPos = el.selectionStart ?? el.value.length
  const digitsBeforeCursor = el.value.slice(0, cursorPos).replace(/\D/g, '').length

  const digits = el.value.replace(/\D/g, '').slice(0, 8)
  let masked = digits.slice(0, 2)
  if (digits.length > 2) masked += '/' + digits.slice(2, 4)
  if (digits.length > 4) masked += '/' + digits.slice(4, 8)

  if (el.value === masked) return

  el.value = masked

  let digitCount = 0
  let newPos = masked.length
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] !== '/') digitCount++
    if (digitCount === digitsBeforeCursor) { newPos = i + 1; break }
  }
  el.setSelectionRange(newPos, newPos)
}

function blockNonDigit(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey) return
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault()
}

export function DatePicker({
  id,
  value,
  placeholder = 'Selecione uma data',
  className,
  disabled,
  onValueChange,
}: DatePickerProps) {
  const parsedValue = value ? [parseDate(value)] : undefined
  const [open, setOpen] = useState(false)

  return (
    <ArkDatePicker.Root
      id={id}
      locale="pt-BR"
      value={parsedValue}
      disabled={disabled}
      open={open}
      onOpenChange={({ open: o }) => setOpen(o)}
      positioning={{ strategy: 'fixed' }}
      onValueChange={(details) => {
        const v = details.value[0]?.toString()
        onValueChange?.(v)
      }}
    >
      <ArkDatePicker.Control className={cn('flex items-center overflow-hidden rounded-md border border-input bg-background', className)}>
        <ArkDatePicker.Input
          placeholder={placeholder}
          onClick={() => setOpen(true)}
          onInput={applyDateMask}
          onKeyDown={blockNonDigit}
          className="h-9 flex-1 bg-transparent px-3 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ArkDatePicker.Trigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border-l border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50">
          <Calendar className="h-4 w-4" />
        </ArkDatePicker.Trigger>
      </ArkDatePicker.Control>
      <Portal>
        <ArkDatePicker.Positioner style={{ zIndex: 9999 }}>
          <ArkDatePicker.Content className="rounded-lg border border-border bg-popover p-3 shadow-md">
            <ArkDatePicker.View view="day">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <ArkDatePicker.PrevTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronLeft className="h-4 w-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="text-sm font-medium hover:text-brand-orange">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronRight className="h-4 w-4" />
                      </ArkDatePicker.NextTrigger>
                    </div>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableHead>
                        <ArkDatePicker.TableRow>
                          {datePicker.weekDays.map((wd, i) => (
                            <ArkDatePicker.TableHeader key={i} className="w-8 text-center text-xs font-medium text-muted-foreground pb-1">
                              {wd.short}
                            </ArkDatePicker.TableHeader>
                          ))}
                        </ArkDatePicker.TableRow>
                      </ArkDatePicker.TableHead>
                      <ArkDatePicker.TableBody>
                        {datePicker.weeks.map((week, wi) => (
                          <ArkDatePicker.TableRow key={wi}>
                            {week.map((day, di) => (
                              <ArkDatePicker.TableCell key={di} value={day}>
                                <ArkDatePicker.TableCellTrigger className="flex h-8 w-8 items-center justify-center rounded text-sm hover:bg-accent data-[selected]:bg-brand-orange data-[selected]:text-white data-[today]:font-bold data-[outside-range]:text-muted-foreground/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-40">
                                  {day.day}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
            <ArkDatePicker.View view="month">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <ArkDatePicker.PrevTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronLeft className="h-4 w-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="text-sm font-medium hover:text-brand-orange">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronRight className="h-4 w-4" />
                      </ArkDatePicker.NextTrigger>
                    </div>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableBody>
                        {datePicker.getMonthsGrid({ columns: 4, format: 'short' }).map((months, ri) => (
                          <ArkDatePicker.TableRow key={ri}>
                            {months.map((month, mi) => (
                              <ArkDatePicker.TableCell key={mi} value={month.value}>
                                <ArkDatePicker.TableCellTrigger className="flex h-8 w-16 items-center justify-center rounded text-sm hover:bg-accent data-[selected]:bg-brand-orange data-[selected]:text-white">
                                  {month.label}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
            <ArkDatePicker.View view="year">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <ArkDatePicker.PrevTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronLeft className="h-4 w-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="text-sm font-medium">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
                        <ChevronRight className="h-4 w-4" />
                      </ArkDatePicker.NextTrigger>
                    </div>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableBody>
                        {datePicker.getYearsGrid({ columns: 4 }).map((years, ri) => (
                          <ArkDatePicker.TableRow key={ri}>
                            {years.map((year, yi) => (
                              <ArkDatePicker.TableCell key={yi} value={year.value}>
                                <ArkDatePicker.TableCellTrigger className="flex h-8 w-16 items-center justify-center rounded text-sm hover:bg-accent data-[selected]:bg-brand-orange data-[selected]:text-white">
                                  {year.label}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
          </ArkDatePicker.Content>
        </ArkDatePicker.Positioner>
      </Portal>
    </ArkDatePicker.Root>
  )
}
