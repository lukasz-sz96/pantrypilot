import { SELECTABLE_UNITS } from '../lib/units'

interface UnitPickerProps {
  value: string
  onChange: (unit: string) => void
  className?: string
}

export function UnitPicker({ value, onChange, className = '' }: UnitPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`unit-picker ${className}`}
    >
      <optgroup label="Volume">
        {SELECTABLE_UNITS.filter(u => u.category === 'volume').map(unit => (
          <option key={unit.value} value={unit.value}>{unit.label}</option>
        ))}
      </optgroup>
      <optgroup label="Weight">
        {SELECTABLE_UNITS.filter(u => u.category === 'weight').map(unit => (
          <option key={unit.value} value={unit.value}>{unit.label}</option>
        ))}
      </optgroup>
      <optgroup label="Count">
        {SELECTABLE_UNITS.filter(u => u.category === 'count').map(unit => (
          <option key={unit.value} value={unit.value}>{unit.label}</option>
        ))}
      </optgroup>
    </select>
  )
}
