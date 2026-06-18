import { NumberInput as ArkNumberInput } from '@ark-ui/react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  value?: string
  defaultValue?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  onValueChange?: (value: number) => void
}

export function NumberInput({
  value,
  defaultValue,
  min,
  max,
  step = 1,
  placeholder,
  className,
  disabled,
  onValueChange,
}: NumberInputProps) {
  return (
    <ArkNumberInput.Root
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(details) => onValueChange?.(details.valueAsNumber)}
      className="flex w-full items-center"
    >
      <ArkNumberInput.Control className={cn('flex w-full items-center rounded-md border border-input bg-background', className)}>
        <ArkNumberInput.DecrementTrigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-l-md border-r border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50">
          <ChevronDown className="h-3.5 w-3.5" />
        </ArkNumberInput.DecrementTrigger>
        <ArkNumberInput.Input
          placeholder={placeholder}
          className="h-9 flex-1 bg-transparent px-3 text-sm text-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ArkNumberInput.IncrementTrigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border-l border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50">
          <ChevronUp className="h-3.5 w-3.5" />
        </ArkNumberInput.IncrementTrigger>
      </ArkNumberInput.Control>
    </ArkNumberInput.Root>
  )
}
